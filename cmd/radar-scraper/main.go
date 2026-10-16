package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/Sanjit-M/rental-radar/internal/browser"
	"github.com/Sanjit-M/rental-radar/internal/config"
	"github.com/Sanjit-M/rental-radar/internal/extractor"
	"github.com/Sanjit-M/rental-radar/internal/scorer"
	"github.com/Sanjit-M/rental-radar/internal/storage"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	cfg := config.Load()
	store := storage.New(cfg)
	subcmd := os.Args[1]

	switch subcmd {
	case "test-parse":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Usage: radar-scraper test-parse <text>")
			os.Exit(1)
		}
		rawText := strings.Join(os.Args[2:], " ")
		runTestParse(rawText)

	case "sync":
		runSync(store)

	case "groups":
		fs := flag.NewFlagSet("groups", flag.ExitOnError)
		headless := fs.Bool("headless", true, "Run Chrome headlessly")
		_ = fs.Parse(os.Args[2:])
		runGroups(cfg, store, *headless)

	case "run":
		fs := flag.NewFlagSet("run", flag.ExitOnError)
		workers := fs.Int("workers", 4, "Number of concurrent browser tabs")
		limitGroups := fs.Int("limit-groups", 0, "Maximum number of enabled groups to scrape (0 = all)")
		headless := fs.Bool("headless", true, "Run Chrome headlessly")
		_ = fs.Parse(os.Args[2:])
		runScrapeCmd(cfg, store, *workers, *limitGroups, *headless)

	case "schedule":
		action := "status"
		if len(os.Args) >= 3 {
			action = os.Args[2]
		}
		runSchedule(cfg, action)

	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`Rental Radar v3 — Go Local Scraper & Turso Sync CLI

Usage:
  radar-scraper groups [--headless=true]
  radar-scraper run [--workers=4] [--limit-groups=N] [--headless=true]
  radar-scraper sync
  radar-scraper test-parse "<sample post text>"
  radar-scraper schedule [install|status]`)
}

func runTestParse(rawText string) {
	ent := extractor.ExtractEntities(rawText, nil)
	scored := scorer.ScoreListing(ent)

	out := map[string]any{
		"entities": ent,
		"location": map[string]any{
			"locality":        ent.Location,
			"zone":            ent.Zone,
			"societyName":     ent.SocietyName,
			"landmark":        ent.Landmark,
			"societyMapsUrl":  ent.SocietyMapsURL,
			"landmarkMapsUrl": ent.LandmarkMapsURL,
			"localityMapsUrl": ent.LocalityMapsURL,
		},
		"commute":        scored.Commute,
		"score":          scored.Score,
		"tier":           scored.Tier,
		"scoreBreakdown": scored.Breakdown,
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(out)
}

func runSync(store *storage.Store) {
	start := time.Now()
	fmt.Println("🔄 [radar-scraper sync] Backfilling Bangalore zones, Google Maps links & syncing to Turso Cloud...")
	stats, err := store.BackfillAndSync()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Sync error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("✅ Sync completed in %s\n", time.Since(start).Round(time.Millisecond))
	fmt.Printf("   • Groups seeded/synced:      %d (Turso total: %d)\n", stats.GroupsSynced, stats.TursoTotalGroups)
	fmt.Printf("   • Listings backfilled/synced: %d (Turso total: %d)\n", stats.ListingsSynced, stats.TursoTotalListings)
}

func runGroups(cfg *config.Config, store *storage.Store, headless bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	groups, err := browser.DiscoverJoinedGroups(ctx, cfg, store, headless)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Groups discovery failed: %v\n", err)
		os.Exit(1)
	}

	enabledCount := 0
	for _, g := range groups {
		if g.Enabled == 1 {
			enabledCount++
		}
	}
	fmt.Printf("📋 Total Facebook Groups in DB: %d (%d enabled for scraping)\n", len(groups), enabledCount)
	for i, g := range groups {
		if i >= 12 {
			fmt.Printf("   ... and %d more groups\n", len(groups)-12)
			break
		}
		status := "disabled"
		if g.Enabled == 1 {
			status = "enabled"
		}
		fmt.Printf("   [%s] %-48s (%s) -> %s\n", status, g.Name, g.Category, g.ID)
	}
}

func runScrapeCmd(cfg *config.Config, store *storage.Store, workers, limitGroups int, headless bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	summary, err := browser.RunScrape(ctx, cfg, store, browser.ScrapeOptions{
		Workers:     workers,
		LimitGroups: limitGroups,
		Headless:    headless,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Scrape failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("\n🎉 Scrape finished: status=%s, groups=%d, scanned=%d, matched=%d\n",
		summary.Status, summary.GroupsScanned, summary.ItemsScanned, summary.ItemsMatched)
}

const plistLabel = "com.rentalradar.daily"

func runSchedule(cfg *config.Config, action string) {
	home, _ := os.UserHomeDir()
	plistDir := filepath.Join(home, "Library", "LaunchAgents")
	plistPath := filepath.Join(plistDir, plistLabel+".plist")
	binPath := filepath.Join(cfg.WorkspaceDir, "bin", "radar-scraper")
	logPath := filepath.Join(cfg.WorkspaceDir, "data", "scraper.log")

	switch action {
	case "install":
		_ = os.MkdirAll(plistDir, 0o755)
		_ = os.MkdirAll(filepath.Dir(logPath), 0o755)

		plistContent := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>%s</string>
    <key>WorkingDirectory</key>
    <string>%s</string>
    <key>ProgramArguments</key>
    <array>
        <string>%s</string>
        <string>run</string>
        <string>--workers=4</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>%s</string>
    <key>StandardErrorPath</key>
    <string>%s</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
`, plistLabel, cfg.WorkspaceDir, binPath, logPath, logPath)

		if err := os.WriteFile(plistPath, []byte(plistContent), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Failed writing LaunchAgent plist: %v\n", err)
			os.Exit(1)
		}

		_ = exec.Command("launchctl", "unload", plistPath).Run()
		_ = exec.Command("launchctl", "load", plistPath).Run()

		fmt.Printf("✅ Installed daily macOS LaunchAgent at: %s\n", plistPath)
		fmt.Printf("   • Schedule: Every day at 09:00 AM local time\n")
		fmt.Printf("   • Command:  %s run --workers=4\n", binPath)
		fmt.Printf("   • Log file: %s\n", logPath)

	case "status":
		if _, err := os.Stat(plistPath); err != nil {
			fmt.Printf("ℹ️ LaunchAgent not installed (%s not found)\n", plistPath)
			return
		}
		fmt.Printf("✅ LaunchAgent installed: %s\n", plistPath)
		fmt.Printf("   • Schedule: Every day at 09:00 AM local time\n")
		fmt.Printf("   • Log file: %s\n", logPath)
		out, err := exec.Command("launchctl", "list", plistLabel).CombinedOutput()
		if err == nil {
			fmt.Printf("   • launchctl status: active\n%s\n", strings.TrimSpace(string(out)))
		} else {
			fmt.Printf("   • launchctl status: plist present on disk\n")
		}

	default:
		fmt.Fprintln(os.Stderr, "Usage: radar-scraper schedule [install|status]")
		os.Exit(1)
	}
}
