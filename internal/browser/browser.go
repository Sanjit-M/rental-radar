package browser

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Sanjit-M/rental-radar/internal/config"
	"github.com/Sanjit-M/rental-radar/internal/dedup"
	"github.com/Sanjit-M/rental-radar/internal/extractor"
	"github.com/Sanjit-M/rental-radar/internal/scorer"
	"github.com/Sanjit-M/rental-radar/internal/storage"
)

// ScrapeOptions configures a multi-worker Facebook group scrape run.
type ScrapeOptions struct {
	Workers     int
	LimitGroups int
	Headless    bool
}

// ScrapeSummary holds metrics from a completed scrape cycle.
type ScrapeSummary struct {
	GroupsScanned int
	ItemsScanned  int
	ItemsMatched  int
	Status        string
}

var rentalGroupKeywords = regexp.MustCompile(`(?i)\b(?:flat|flats|flatmate|flatmates|room|rooms|roommate|roommates|rent|rental|rentals|house|housing|home|broker|brokers|nobroker|pg|stay|accommodation|property|properties|tenant|bangalore|bengaluru|bellandur|kadubeesanahalli|hsr|koramangala|indiranagar|whitefield|marathahalli|sarjapur|hebbal|btm|jayanagar|jp\s*nagar|electronic\s*city)\b`)

// ClassifyGroup determines the category and default enabled status for a discovered Facebook group.
func ClassifyGroup(name string) (string, int) {
	lower := strings.ToLower(name)
	if strings.Contains(lower, "without broker") || strings.Contains(lower, "no broker") {
		return "No-Brokerage Bangalore", 1
	}
	if strings.Contains(lower, "bellandur") || strings.Contains(lower, "kadubeesanahalli") || strings.Contains(lower, "marathahalli") || strings.Contains(lower, "ptp") {
		return "ORR & Bellandur Rentals", 1
	}
	if strings.Contains(lower, "hsr") || strings.Contains(lower, "koramangala") || strings.Contains(lower, "btm") {
		return "HSR & Koramangala Rentals", 1
	}
	if strings.Contains(lower, "whitefield") || strings.Contains(lower, "indiranagar") {
		return "East & Central Rentals", 1
	}
	if rentalGroupKeywords.MatchString(name) {
		return "Bangalore Rentals & Flatmates", 1
	}
	return "Other Joined Group", 0
}

// DiscoverJoinedGroups navigates to https://www.facebook.com/groups/joins/, extracts all groups the user is a member of, merges with the 29 curated Bangalore rental groups, and persists them to fb_groups.
func DiscoverJoinedGroups(ctx context.Context, cfg *config.Config, store *storage.Store, headless bool) ([]storage.FBGroup, error) {
	if err := store.InitSchema(); err != nil {
		return nil, err
	}

	merged := make(map[string]storage.FBGroup)
	for _, cg := range config.CuratedBangaloreGroups {
		enabled := 0
		if cg.Enabled {
			enabled = 1
		}
		merged[strings.ToLower(cg.ID)] = storage.FBGroup{
			ID:          cg.ID,
			Name:        cg.Name,
			URL:         cg.URL,
			MemberCount: cg.MemberCount,
			Category:    cg.Category,
			Enabled:     enabled,
		}
	}

	cookies, err := cfg.LoadCookies()
	if err == nil && len(cookies) > 0 {
		cdp, err := LaunchCDP(ctx, cfg, headless)
		if err == nil {
			defer cdp.Close()
			tab, err := cdp.NewTab(ctx)
			if err == nil {
				defer tab.Close()
				fmt.Println("🌐 Navigating to https://www.facebook.com/groups/joins/ to discover joined groups...")
				if err := tab.Navigate(ctx, "https://www.facebook.com/groups/joins/", 3500*time.Millisecond); err == nil {
					for i := 0; i < 6; i++ {
						_, _ = tab.EvalString(ctx, `window.scrollBy(0, 1400); "ok"`)
						time.Sleep(700 * time.Millisecond)
					}

					jsExtractGroups := `(() => {
						const out = [];
						const seen = new Set();
						const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
						for (const a of anchors) {
							const href = a.getAttribute('href') || '';
							const m = href.match(/\/groups\/([^/?#]+)/);
							if (!m || !m[1]) continue;
							const id = m[1];
							if (['joins', 'feed', 'discover', 'create', 'notifications', 'search'].includes(id.toLowerCase())) continue;
							if (seen.has(id.toLowerCase())) continue;

							const card = a.closest('div[role="listitem"], div[class*="x1yztbdb"], div[class*="x1n2onr6"]') || a;
							const rawText = (card.innerText || a.innerText || '').trim();
							const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !/^view group$/i.test(l) && !/^last active/i.test(l) && !/^joined/i.test(l));
							if (lines.length === 0) continue;

							const name = lines[0];
							if (name.length < 4 || name.length > 110) continue;
							let memberCount = '';
							for (const line of lines) {
								if (/members?/i.test(line) || /\d+[kKmM]\b/.test(line)) {
									memberCount = line;
									break;
								}
							}
							seen.add(id.toLowerCase());
							out.push({ id, name, memberCount });
						}
						return JSON.stringify(out);
					})()`

					if rawJSON, err := tab.EvalString(ctx, jsExtractGroups); err == nil && rawJSON != "" {
						var discovered []struct {
							ID          string `json:"id"`
							Name        string `json:"name"`
							MemberCount string `json:"memberCount"`
						}
						if err := json.Unmarshal([]byte(rawJSON), &discovered); err == nil && len(discovered) > 0 {
							fmt.Printf("✅ Discovered %d joined groups directly from Facebook session!\n", len(discovered))
							for _, d := range discovered {
								cat, enabled := ClassifyGroup(d.Name)
								key := strings.ToLower(d.ID)
								if existing, ok := merged[key]; ok {
									if d.MemberCount != "" {
										existing.MemberCount = d.MemberCount
									}
									merged[key] = existing
								} else {
									merged[key] = storage.FBGroup{
										ID:          d.ID,
										Name:        d.Name,
										URL:         fmt.Sprintf("https://www.facebook.com/groups/%s/?sorting_setting=CHRONOLOGICAL", d.ID),
										MemberCount: d.MemberCount,
										Category:    cat,
										Enabled:     enabled,
									}
								}
							}
						}
					}
				}
			}
		}
	}

	groups := make([]storage.FBGroup, 0, len(merged))
	for _, g := range merged {
		groups = append(groups, g)
	}

	if err := store.UpsertGroups(groups); err != nil {
		return nil, err
	}
	return store.GetGroups(false)
}

type rawDOMPost struct {
	PostURL    string   `json:"postUrl"`
	AuthorName string   `json:"authorName"`
	PostedTime string   `json:"postedTime"`
	RawText    string   `json:"rawText"`
	ImageURLs  []string `json:"imageUrls"`
}

const jsExtractFeedPosts = `(() => {
	const results = [];
	const seenUrls = new Set();
	let articles = Array.from(document.querySelectorAll('div[data-pagelet*="Feed"] div[role="feed"] > div, [role="feed"] > div, [role="article"], div[class*="x1yztbdb"]'));
	if (articles.length === 0) {
		articles = Array.from(document.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]'))
			.map(a => a.closest('div[role="article"], div[role="main"] > div > div > div > div'))
			.filter(Boolean);
	}

	for (const el of articles) {
		const rawText = (el.innerText || '').trim();
		if (rawText.length < 35) continue;

		let authorName = '';
		const authorEl = el.querySelector('h2 a, h3 a, h4 a, a[role="link"] > span[dir="auto"], strong > span, span[dir="auto"] strong');
		if (authorEl) {
			const t = (authorEl.innerText || '').trim();
			if (t.length > 1 && !/sponsored|suggested|anonymous/i.test(t)) {
				authorName = t;
			}
		}

		let postedTime = '';
		const timeLinks = Array.from(el.querySelectorAll('a[aria-label], abbr'));
		for (const tl of timeLinks) {
			const label = tl.getAttribute('aria-label') || tl.getAttribute('title') || '';
			if (label && (/\d/.test(label) || /yesterday|ago|just now/i.test(label))) {
				postedTime = label;
				break;
			}
		}

		let postUrl = '';
		const links = Array.from(el.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="multi_permalinks="], a[role="link"]'));
		for (const a of links) {
			const rawHref = a.getAttribute('href') || '';
			if (!rawHref) continue;
			const full = rawHref.startsWith('http') ? rawHref : 'https://www.facebook.com' + rawHref;
			try {
				const u = new URL(full);
				if (!u.hostname.includes('facebook.com')) continue;
				const mp = u.searchParams.get('multi_permalinks');
				if (mp && /^\d+$/.test(mp)) {
					const gm = u.pathname.match(/\/groups\/([^/?#]+)/);
					if (gm) {
						postUrl = 'https://www.facebook.com/groups/' + gm[1] + '/posts/' + mp + '/';
						break;
					}
				}
				const pm = u.pathname.match(/\/groups\/([^/?#]+)\/(?:posts|permalink)\/([^/?#]+)/);
				if (pm) {
					postUrl = 'https://www.facebook.com/groups/' + pm[1] + '/posts/' + pm[2] + '/';
					break;
				}
				if (u.pathname.includes('permalink.php') && u.searchParams.has('story_fbid')) {
					const fbid = u.searchParams.get('story_fbid');
					const gid = u.searchParams.get('id');
					postUrl = gid
						? 'https://www.facebook.com/permalink.php?story_fbid=' + fbid + '&id=' + gid
						: 'https://www.facebook.com/permalink.php?story_fbid=' + fbid;
					break;
				}
			} catch {}
		}

		if (!postUrl || seenUrls.has(postUrl)) continue;
		seenUrls.add(postUrl);

		const imageUrls = [];
		const imgs = Array.from(el.querySelectorAll('img'));
		for (const img of imgs) {
			const src = img.getAttribute('src') || '';
			if ((src.includes('fbcdn') || src.includes('scontent')) &&
				!src.includes('emoji') && !src.includes('rsrc.php') &&
				!src.includes('/p48x48/') && !src.includes('/p50x50/') &&
				!src.includes('/s100x100/') && !src.includes('/s150x150/') &&
				imageUrls.length < 8) {
				if (!imageUrls.includes(src)) imageUrls.push(src);
			}
		}

		results.push({ postUrl, authorName, postedTime, rawText, imageUrls });
	}
	return JSON.stringify(results);
})()`

// RunScrape runs a bounded worker pool across enabled Facebook groups, extracts and scores listings, and syncs to local SQLite and Turso Cloud.
func RunScrape(ctx context.Context, cfg *config.Config, store *storage.Store, opts ScrapeOptions) (*ScrapeSummary, error) {
	if opts.Workers <= 0 {
		opts.Workers = 4
	}
	if err := store.InitSchema(); err != nil {
		return nil, err
	}

	if store.HasTurso() {
		_, _ = store.PullGroupsFromTurso()
	}
	_, _ = store.SeedCuratedGroups()
	groups, _ := store.GetGroups(true)
	if opts.LimitGroups > 0 && len(groups) > opts.LimitGroups {
		groups = groups[:opts.LimitGroups]
	}

	cdp, err := LaunchCDP(ctx, cfg, opts.Headless)
	if err != nil {
		return nil, err
	}
	defer cdp.Close()

	queue := make(chan storage.FBGroup, len(groups))
	for _, g := range groups {
		queue <- g
	}
	close(queue)

	var (
		mu            sync.Mutex
		scanned       int
		lastPageTitle string
		candidates    []dedup.Candidate
		records       []storage.ListingRecord
		wg            sync.WaitGroup
	)

	workerCount := opts.Workers
	if workerCount > len(groups) && len(groups) > 0 {
		workerCount = len(groups)
	}

	fmt.Printf("🚀 Launching %d Go CDP workers across %d enabled Facebook groups...\n", workerCount, len(groups))

	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			tab, err := cdp.NewTab(ctx)
			if err != nil {
				return
			}
			defer tab.Close()

			for g := range queue {
				targetURL := g.URL
				if !strings.Contains(targetURL, "sorting_setting=CHRONOLOGICAL") {
					if strings.Contains(targetURL, "?") {
						targetURL += "&sorting_setting=CHRONOLOGICAL"
					} else {
						targetURL += "?sorting_setting=CHRONOLOGICAL"
					}
				}
				fmt.Printf("🔍 [Worker %d] Scraping %s (%s)\n", workerID+1, g.Name, g.ID)
				if err := tab.Navigate(ctx, targetURL, 2800*time.Millisecond); err != nil {
					continue
				}

				// Scroll and click "See more" buttons
				for s := 0; s < 8; s++ {
					_, _ = tab.EvalString(ctx, `(() => {
						window.scrollBy(0, 1400);
						const btns = Array.from(document.querySelectorAll('div[role="button"], span'));
						for (const b of btns) {
							if ((b.innerText || '').trim() === 'See more') {
								try { b.click(); } catch {}
							}
						}
						return "ok";
					})()`)
					time.Sleep(750 * time.Millisecond)
				}

				rawJSON, err := tab.EvalString(ctx, jsExtractFeedPosts)
				if err != nil || rawJSON == "" {
					if pageTitle, tErr := tab.EvalString(ctx, "document.title || location.href"); tErr == nil && pageTitle != "" {
						mu.Lock()
						lastPageTitle = pageTitle
						mu.Unlock()
					}
					continue
				}
				var posts []rawDOMPost
				if err := json.Unmarshal([]byte(rawJSON), &posts); err != nil {
					continue
				}
				if len(posts) == 0 {
					if pageTitle, tErr := tab.EvalString(ctx, "document.title || location.href"); tErr == nil && pageTitle != "" {
						mu.Lock()
						lastPageTitle = pageTitle
						mu.Unlock()
					}
				}

				now := time.Now()
				for _, p := range posts {
					clean := extractor.CleanPostText(p.RawText)
					ent := extractor.ExtractEntities(clean, p.ImageURLs)
					if !ent.IsRentalOffering {
						mu.Lock()
						scanned++
						mu.Unlock()
						continue
					}

					author := p.AuthorName
					if author == "" {
						author = extractor.ExtractAuthorFromText(clean)
					}
					timeSource := p.PostedTime
					if timeSource == "" {
						lines := strings.Split(p.RawText, "\n")
						if len(lines) > 6 {
							lines = lines[:6]
						}
						timeSource = strings.Join(lines, " ")
					}
					_, postedIST, _ := extractor.ParseFacebookTimestamp(timeSource, now)
					scored := scorer.ScoreListing(ent)
					fbPostID := extractor.GeneratePostID(g.Name, author, clean)

					cand := dedup.Candidate{
						FBPostID:     fbPostID,
						GroupName:    g.Name,
						AuthorName:   author,
						RawText:      clean,
						Rent:         ent.Rent,
						SocietyName:  ent.SocietyName,
						ContactPhone: ent.ContactPhone,
					}

					bdBytes, _ := json.Marshal(scored.Breakdown)
					imgBytes, _ := json.Marshal(ent.ImageURLs)
					socOrLoc := ent.SocietyName
					if socOrLoc == "" {
						socOrLoc = ent.Location
					}
					summary := clean
					if len(summary) > 250 {
						summary = summary[:250]
					}

					rec := storage.ListingRecord{
						FBPostID:                       fbPostID,
						GroupID:                        g.ID,
						GroupName:                      g.Name,
						PostURL:                        p.PostURL,
						AuthorName:                     author,
						PostedTime:                     postedIST,
						RawText:                        clean,
						Location:                       ent.Location,
						Zone:                           ent.Zone,
						Landmark:                       ent.Landmark,
						SocietyMapsURL:                 ent.SocietyMapsURL,
						LandmarkMapsURL:                ent.LandmarkMapsURL,
						LocalityMapsURL:                ent.LocalityMapsURL,
						Title:                          fmt.Sprintf("%s in %s", ent.BHKType, socOrLoc),
						Summary:                        summary,
						ImageURLs:                      string(imgBytes),
						BHKType:                        ent.BHKType,
						Rent:                           ent.Rent,
						Deposit:                        ent.Deposit,
						IsBrokerage:                    boolToInt(ent.IsBrokerage),
						IsGatedSociety:                 boolToInt(ent.IsGatedSociety),
						SocietyName:                    ent.SocietyName,
						HasSwimmingPool:                boolToInt(ent.HasSwimmingPool),
						HasPowerBackup:                 boolToInt(ent.HasPowerBackup),
						HasAttachedWashroom:            boolToInt(ent.HasAttachedWashroom),
						HasBalcony:                     boolToInt(ent.HasBalcony),
						Furnishing:                     ent.Furnishing,
						IsKadubeesanahalliDirect:       boolToInt(ent.IsKadubeesanahalliDirect),
						ContactPhone:                   ent.ContactPhone,
						DistanceKm:                     scored.Commute.DistanceKm,
						InboundMins:                    scored.Commute.InboundMins,
						OutboundMins:                   scored.Commute.OutboundMins,
						TwoWayAvgPeakMins:              scored.Commute.TwoWayAvgPeakMins,
						HasPanathurUnderpassBottleneck: boolToInt(scored.Commute.HasPanathurUnderpassBottleneck),
						Score:                          scored.Score,
						ScoreBreakdown:                 string(bdBytes),
						Tier:                           scored.Tier,
						UserStatus:                     "new",
					}

					mu.Lock()
					scanned++
					isDup := false
					for _, existing := range candidates {
						if dedup.AreDuplicates(existing, cand) {
							isDup = true
							break
						}
					}
					if !isDup {
						candidates = append(candidates, cand)
						records = append(records, rec)
						fmt.Printf("  ✨ [%d pts | %s] %s — %s (%s)\n", rec.Score, rec.Zone, socOrLoc, rec.BHKType, rec.PostedTime)
					}
					mu.Unlock()
				}

				g.LastScrapedAt = time.Now().UTC().Format("2006-01-02 15:04:05")
				_ = store.UpsertGroups([]storage.FBGroup{g})
			}
		}(w)
	}

	wg.Wait()

	if len(records) > 0 {
		if err := store.UpsertListings(records); err != nil {
			return nil, err
		}
	}

	status := "success"
	errMsg := ""
	if scanned == 0 {
		status = "no_posts_found"
		if lastPageTitle == "" {
			lastPageTitle = "unknown"
		}
		errMsg = fmt.Sprintf("0 posts extracted (page title: %s — Facebook may require residential IP / fresh cookies)", lastPageTitle)
	}
	_ = store.LogScrapeRun(status, scanned, len(records), len(groups), errMsg)

	return &ScrapeSummary{
		GroupsScanned: len(groups),
		ItemsScanned:  scanned,
		ItemsMatched:  len(records),
		Status:        status,
	}, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
