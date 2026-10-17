package config

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// Config holds runtime configuration for the Rental Radar Go CLI.
type Config struct {
	WorkspaceDir     string
	LocalDBPath      string
	TursoDatabaseURL string
	TursoAuthToken   string
	FBSessionStorage string
	ProfileDir       string
	StorageStatePath string
	ChromeBinaryPath string
}

// Cookie represents a browser cookie from Playwright storageState.json.
type Cookie struct {
	Name     string  `json:"name"`
	Value    string  `json:"value"`
	Domain   string  `json:"domain"`
	Path     string  `json:"path"`
	Expires  float64 `json:"expires"`
	HTTPOnly bool    `json:"httpOnly"`
	Secure   bool    `json:"secure"`
	SameSite string  `json:"sameSite"`
}

// StorageState represents a Playwright storageState.json structure.
type StorageState struct {
	Cookies []Cookie `json:"cookies"`
}

// CuratedGroup represents a known Facebook group or chronological search feed.
type CuratedGroup struct {
	ID          string
	Name        string
	URL         string
	MemberCount string
	Category    string
	Enabled     bool
}

// CuratedBangaloreGroups contains the 29 curated Bangalore rental Facebook groups.
var CuratedBangaloreGroups = []CuratedGroup{
	{
		ID:          "591413389157630",
		Name:        "Flat and Flatmates Bellandur, Kadubeesanahalli (200k)",
		URL:         "https://www.facebook.com/groups/591413389157630/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "200K members",
		Category:    "ORR & Bellandur Rentals",
		Enabled:     true,
	},
	{
		ID:          "507116087403813",
		Name:        "Flat and Flatmates Bangalore (145k)",
		URL:         "https://www.facebook.com/groups/507116087403813/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "145K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "flatsandflatmatesbangaluru",
		Name:        "Flats and Flatmates Bengaluru (130k)",
		URL:         "https://www.facebook.com/groups/flatsandflatmatesbangaluru/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "130K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "findmyroombangalore",
		Name:        "Find My Room Bangalore (105k)",
		URL:         "https://www.facebook.com/groups/findmyroombangalore/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "105K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "697855465840944",
		Name:        "Flats Without Brokers Bangalore (100k)",
		URL:         "https://www.facebook.com/groups/697855465840944/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "100K members",
		Category:    "No-Brokerage Bangalore",
		Enabled:     true,
	},
	{
		ID:          "329320681157074",
		Name:        "Flat and Flatmates Bangalore (94k)",
		URL:         "https://www.facebook.com/groups/329320681157074/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "94K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "1703473933213030",
		Name:        "Flat and Flatmates Bangalore (86k)",
		URL:         "https://www.facebook.com/groups/1703473933213030/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "86K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "876779221120021",
		Name:        "Flats Without Brokers Bangalore (72k)",
		URL:         "https://www.facebook.com/groups/876779221120021/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "72K members",
		Category:    "No-Brokerage Bangalore",
		Enabled:     true,
	},
	{
		ID:          "1918733344819133",
		Name:        "Flats and Flatmates Bangalore (63k)",
		URL:         "https://www.facebook.com/groups/1918733344819133/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "63K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "FlatsandFlatmatesBengaluru",
		Name:        "Flats and Flatmates Bengaluru (39k)",
		URL:         "https://www.facebook.com/groups/FlatsandFlatmatesBengaluru/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "39K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "636932320207695",
		Name:        "Bangalore Flatmates Community (39k)",
		URL:         "https://www.facebook.com/groups/636932320207695/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "39K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "224322741398603",
		Name:        "Flat and Flatmates Bangalore (39k)",
		URL:         "https://www.facebook.com/groups/224322741398603/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "39K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "184612851933582",
		Name:        "Flats and Flatmates Bangalore (35k)",
		URL:         "https://www.facebook.com/groups/184612851933582/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "35K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "147988655894011",
		Name:        "Bangalore Rentals & Flatmates (35k)",
		URL:         "https://www.facebook.com/groups/147988655894011/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "35K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "434238014108725",
		Name:        "Flats and Flatmates Bangalore (33k)",
		URL:         "https://www.facebook.com/groups/434238014108725/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "33K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "1402333569809567",
		Name:        "Bangalore Flat Seekers & Offers (32k)",
		URL:         "https://www.facebook.com/groups/1402333569809567/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "32K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "380069852631811",
		Name:        "Flats Without Broker Bangalore (31k)",
		URL:         "https://www.facebook.com/groups/380069852631811/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "31K members",
		Category:    "No-Brokerage Bangalore",
		Enabled:     true,
	},
	{
		ID:          "929554973876448",
		Name:        "Bangalore Flat & Roommates (27k)",
		URL:         "https://www.facebook.com/groups/929554973876448/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "27K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "193688959165052",
		Name:        "Flat and Flatmates Bangalore (27k)",
		URL:         "https://www.facebook.com/groups/193688959165052/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "27K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "513083563341035",
		Name:        "Flats and Flatmates Bangalore (24k)",
		URL:         "https://www.facebook.com/groups/513083563341035/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "24K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "1110321379331221",
		Name:        "Flatmates Bangalore (23k)",
		URL:         "https://www.facebook.com/groups/1110321379331221/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "23K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "867324518317770",
		Name:        "Bangalore Flats & Rooms (23k)",
		URL:         "https://www.facebook.com/groups/867324518317770/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "23K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "781559679246306",
		Name:        "Flats and Flatmates Bangalore (22k)",
		URL:         "https://www.facebook.com/groups/781559679246306/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "22K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "650663023927752",
		Name:        "Bangalore Flatmates Community (21k)",
		URL:         "https://www.facebook.com/groups/650663023927752/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "21K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "457653071101288",
		Name:        "Flats and Flatmates Bangalore (21k)",
		URL:         "https://www.facebook.com/groups/457653071101288/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "21K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "1265072124774804",
		Name:        "Flats and Flatmates Kadubeesanahalli / PTP",
		URL:         "https://www.facebook.com/groups/1265072124774804/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "18K members",
		Category:    "ORR & Bellandur Rentals",
		Enabled:     true,
	},
	{
		ID:          "flatandflatmatesbangalore",
		Name:        "Flat and Flatmates Bangalore",
		URL:         "https://www.facebook.com/groups/flatandflatmatesbangalore/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "150K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
	{
		ID:          "flatswithoutbrokersbangalore",
		Name:        "Flats Without Brokers Bangalore",
		URL:         "https://www.facebook.com/groups/flatswithoutbrokersbangalore/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "85K members",
		Category:    "No-Brokerage Bangalore",
		Enabled:     true,
	},
	{
		ID:          "bangaloreflatmates",
		Name:        "Bangalore Flatmates",
		URL:         "https://www.facebook.com/groups/bangaloreflatmates/?sorting_setting=CHRONOLOGICAL",
		MemberCount: "60K members",
		Category:    "Bangalore Rentals & Flatmates",
		Enabled:     true,
	},
}

// Load reads .env files and environment variables into Config.
func Load() *Config {
	cwd, err := os.Getwd()
	if err != nil {
		cwd = "/Users/nebulo/Workspace/rental-radar"
	}

	loadEnvFile(filepath.Join(cwd, ".env"))
	loadEnvFile(filepath.Join(cwd, ".env.local"))

	home, _ := os.UserHomeDir()
	profileDir := filepath.Join(home, ".fb_rental_profile")
	storageStatePath := filepath.Join(profileDir, "storageState.json")

	tursoURL := strings.TrimSpace(os.Getenv("TURSO_DATABASE_URL"))
	if strings.HasPrefix(tursoURL, "libsql://") {
		tursoURL = "https://" + strings.TrimPrefix(tursoURL, "libsql://")
	}
	tursoURL = strings.TrimRight(tursoURL, "/")

	localDB := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	localDB = strings.TrimPrefix(localDB, "file:")
	if localDB == "" {
		localDB = filepath.Join(cwd, "data", "listings.db")
	} else if !filepath.IsAbs(localDB) {
		localDB = filepath.Join(cwd, localDB)
	}

	return &Config{
		WorkspaceDir:     cwd,
		LocalDBPath:      localDB,
		TursoDatabaseURL: tursoURL,
		TursoAuthToken:   strings.TrimSpace(os.Getenv("TURSO_AUTH_TOKEN")),
		FBSessionStorage: strings.TrimSpace(os.Getenv("FB_SESSION_STORAGE")),
		ProfileDir:       profileDir,
		StorageStatePath: storageStatePath,
		ChromeBinaryPath: detectChromeBinary(home),
	}
}

func loadEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		val = strings.Trim(val, `"'`)
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
}

func detectChromeBinary(home string) string {
	if envBin := os.Getenv("CHROME_BIN"); envBin != "" {
		if _, err := os.Stat(envBin); err == nil {
			return envBin
		}
	}

	candidates := []string{
		filepath.Join(home, "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
		"/usr/bin/google-chrome-stable",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium-browser",
		"/usr/bin/chromium",
	}

	macMatches, _ := filepath.Glob(filepath.Join(home, "Library/Caches/ms-playwright/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
	linuxMatches, _ := filepath.Glob(filepath.Join(home, ".cache/ms-playwright/chromium-*/chrome-linux/chrome"))
	candidates = append(macMatches, append(linuxMatches, candidates...)...)

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
}

// LoadCookies parses Facebook session cookies from FB_SESSION_STORAGE or ~/.fb_rental_profile/storageState.json.
func (c *Config) LoadCookies() ([]Cookie, error) {
	if c.FBSessionStorage != "" {
		if cookies := parseRawStorageState(c.FBSessionStorage); len(cookies) > 0 {
			return cookies, nil
		}
	}
	data, err := os.ReadFile(c.StorageStatePath)
	if err != nil {
		return nil, err
	}
	cookies := parseRawStorageState(string(data))
	return cookies, nil
}

func parseRawStorageState(raw string) []Cookie {
	input := strings.TrimSpace(raw)
	input = strings.Trim(input, `"'`)

	var state StorageState
	if strings.HasPrefix(input, "{") {
		if err := json.Unmarshal([]byte(input), &state); err == nil && len(state.Cookies) > 0 {
			return state.Cookies
		}
	}
	if strings.HasPrefix(input, "[") {
		var list []Cookie
		if err := json.Unmarshal([]byte(input), &list); err == nil && len(list) > 0 {
			return list
		}
	}

	// Base64 decode attempt
	if decoded, err := base64.StdEncoding.DecodeString(input); err == nil {
		decStr := strings.TrimSpace(string(decoded))
		if err := json.Unmarshal([]byte(decStr), &state); err == nil && len(state.Cookies) > 0 {
			return state.Cookies
		}
	}

	// Raw cookie string fallback ("c_user=...; xs=...")
	if strings.Contains(input, "=") && (strings.Contains(input, ";") || strings.Contains(input, "c_user")) {
		parts := strings.Split(input, ";")
		var cookies []Cookie
		for _, p := range parts {
			p = strings.TrimSpace(p)
			eq := strings.IndexByte(p, '=')
			if eq > 0 {
				cookies = append(cookies, Cookie{
					Name:     strings.TrimSpace(p[:eq]),
					Value:    strings.TrimSpace(p[eq+1:]),
					Domain:   ".facebook.com",
					Path:     "/",
					Expires:  -1,
					HTTPOnly: false,
					Secure:   true,
					SameSite: "Lax",
				})
			}
		}
		return cookies
	}

	return nil
}
