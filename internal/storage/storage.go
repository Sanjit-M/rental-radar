package storage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Sanjit-M/rental-radar/internal/config"
	"github.com/Sanjit-M/rental-radar/internal/extractor"
	"github.com/Sanjit-M/rental-radar/internal/gazetteer"
	"github.com/Sanjit-M/rental-radar/internal/scorer"
)

// FBGroup represents a row in the fb_groups table.
type FBGroup struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	URL           string `json:"url"`
	MemberCount   string `json:"member_count"`
	Category      string `json:"category"`
	Enabled       int    `json:"enabled"`
	ListingsCount int    `json:"listings_count"`
	LastScrapedAt string `json:"last_scraped_at,omitempty"`
}

// ListingRecord represents a row in the listings table.
type ListingRecord struct {
	ID                             int     `json:"id,omitempty"`
	FBPostID                       string  `json:"fb_post_id"`
	GroupID                        string  `json:"group_id"`
	GroupName                      string  `json:"group_name"`
	PostURL                        string  `json:"post_url"`
	AuthorName                     string  `json:"author_name"`
	PostedTime                     string  `json:"posted_time"`
	RawText                        string  `json:"raw_text"`
	Location                       string  `json:"location"`
	Zone                           string  `json:"zone"`
	Landmark                       string  `json:"landmark"`
	SocietyMapsURL                 string  `json:"society_maps_url"`
	LandmarkMapsURL                string  `json:"landmark_maps_url"`
	LocalityMapsURL                string  `json:"locality_maps_url"`
	Title                          string  `json:"title"`
	Summary                        string  `json:"summary"`
	ImageURLs                      string  `json:"image_urls"`
	BHKType                        string  `json:"bhk_type"`
	Rent                           *int    `json:"rent"`
	Deposit                        *int    `json:"deposit"`
	IsBrokerage                    int     `json:"is_brokerage"`
	IsGatedSociety                 int     `json:"is_gated_society"`
	SocietyName                    string  `json:"society_name"`
	HasSwimmingPool                int     `json:"has_swimming_pool"`
	HasPowerBackup                 int     `json:"has_power_backup"`
	HasAttachedWashroom            int     `json:"has_attached_washroom"`
	HasBalcony                     int     `json:"has_balcony"`
	Furnishing                     string  `json:"furnishing"`
	IsKadubeesanahalliDirect       int     `json:"is_kadubeesanahalli_direct"`
	ContactPhone                   string  `json:"contact_phone"`
	DistanceKm                     float64 `json:"distance_km"`
	InboundMins                    int     `json:"inbound_mins"`
	OutboundMins                   int     `json:"outbound_mins"`
	TwoWayAvgPeakMins              int     `json:"two_way_avg_peak_mins"`
	HasPanathurUnderpassBottleneck int     `json:"has_panathur_underpass_bottleneck"`
	Score                          int     `json:"score"`
	ScoreBreakdown                 string  `json:"score_breakdown"`
	Tier                           string  `json:"tier"`
	UserStatus                     string  `json:"user_status"`
	CreatedAt                      string  `json:"created_at,omitempty"`
	UpdatedAt                      string  `json:"updated_at,omitempty"`
}

// SyncStats summarizes the result of a BackfillAndSync operation.
type SyncStats struct {
	GroupsSynced       int
	ListingsBackfilled int
	ListingsSynced     int
	TursoTotalListings int
	TursoTotalGroups   int
}

// Store manages dual-target persistence across Local SQLite and Turso Cloud HTTP.
type Store struct {
	localDBPath string
	tursoURL    string
	tursoToken  string
	httpClient  *http.Client
}

// New creates a new dual-target Store.
func New(cfg *config.Config) *Store {
	return &Store{
		localDBPath: cfg.LocalDBPath,
		tursoURL:    cfg.TursoDatabaseURL,
		tursoToken:  cfg.TursoAuthToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// HasTurso returns true when Turso Cloud credentials are configured.
func (s *Store) HasTurso() bool {
	return s.tursoURL != "" && s.tursoToken != ""
}

const schemaSQL = `
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fb_post_id TEXT UNIQUE NOT NULL,
  group_id TEXT,
  group_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  posted_time TEXT NOT NULL DEFAULT 'Recently',
  raw_text TEXT NOT NULL,
  location TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'ORR & Bellandur',
  landmark TEXT,
  society_maps_url TEXT,
  landmark_maps_url TEXT,
  locality_maps_url TEXT NOT NULL DEFAULT '',
  title TEXT,
  summary TEXT,
  image_urls TEXT DEFAULT '[]',
  bhk_type TEXT NOT NULL,
  rent INTEGER,
  deposit INTEGER,
  is_brokerage INTEGER NOT NULL,
  is_gated_society INTEGER NOT NULL,
  society_name TEXT,
  has_swimming_pool INTEGER NOT NULL,
  has_power_backup INTEGER NOT NULL,
  has_attached_washroom INTEGER NOT NULL,
  has_balcony INTEGER NOT NULL,
  furnishing TEXT NOT NULL,
  is_kadubeesanahalli_direct INTEGER NOT NULL,
  contact_phone TEXT,
  distance_km REAL NOT NULL,
  inbound_mins INTEGER NOT NULL,
  outbound_mins INTEGER NOT NULL,
  two_way_avg_peak_mins INTEGER NOT NULL,
  has_panathur_underpass_bottleneck INTEGER NOT NULL,
  score INTEGER NOT NULL,
  score_breakdown TEXT NOT NULL,
  tier TEXT NOT NULL,
  user_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(score DESC);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_status);

CREATE TABLE IF NOT EXISTS fb_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  member_count TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Rental & Flatmates',
  enabled INTEGER NOT NULL DEFAULT 1,
  listings_count INTEGER NOT NULL DEFAULT 0,
  last_scraped_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  items_scanned INTEGER NOT NULL,
  items_matched INTEGER NOT NULL,
  groups_scanned INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

var migrationSQLs = []string{
	"ALTER TABLE listings ADD COLUMN landmark TEXT",
	"ALTER TABLE listings ADD COLUMN title TEXT",
	"ALTER TABLE listings ADD COLUMN summary TEXT",
	"ALTER TABLE listings ADD COLUMN image_urls TEXT DEFAULT '[]'",
	"ALTER TABLE listings ADD COLUMN group_id TEXT",
	"ALTER TABLE listings ADD COLUMN zone TEXT NOT NULL DEFAULT 'ORR & Bellandur'",
	"ALTER TABLE listings ADD COLUMN society_maps_url TEXT",
	"ALTER TABLE listings ADD COLUMN landmark_maps_url TEXT",
	"ALTER TABLE listings ADD COLUMN locality_maps_url TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE scrape_logs ADD COLUMN groups_scanned INTEGER NOT NULL DEFAULT 0",
	"CREATE INDEX IF NOT EXISTS idx_listings_zone ON listings(zone)",
}

// InitSchema initializes tables and runs idempotent column migrations on local SQLite and Turso Cloud.
func (s *Store) InitSchema() error {
	if s.localDBPath != "" {
		_ = os.MkdirAll(filepath.Dir(s.localDBPath), 0o755)
		if err := s.ExecLocal(schemaSQL); err != nil {
			return fmt.Errorf("local schema init failed: %w", err)
		}
		for _, mig := range migrationSQLs {
			_ = s.ExecLocal(mig + ";")
		}
	}

	if s.HasTurso() {
		var stmts []TursoStmt
		for _, raw := range strings.Split(schemaSQL, ";") {
			trimmed := strings.TrimSpace(raw)
			if trimmed != "" {
				stmts = append(stmts, TursoStmt{SQL: trimmed})
			}
		}
		if err := s.ExecTursoBatch(stmts, true); err != nil {
			return fmt.Errorf("turso schema init failed: %w", err)
		}
		var migStmts []TursoStmt
		for _, mig := range migrationSQLs {
			migStmts = append(migStmts, TursoStmt{SQL: mig})
		}
		_ = s.ExecTursoBatch(migStmts, true)
	}
	return nil
}

// ExecLocal executes SQL statements against the local SQLite database file using sqlite3 CLI.
func (s *Store) ExecLocal(sqlText string) error {
	if s.localDBPath == "" {
		return nil
	}
	fullSQL := "PRAGMA busy_timeout = 5000;\n" + sqlText + "\n"
	cmd := exec.Command("sqlite3", s.localDBPath)
	cmd.Stdin = strings.NewReader(fullSQL)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("sqlite3 exec error: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// QueryLocalJSON executes a SELECT query against local SQLite and unmarshals the JSON result.
func (s *Store) QueryLocalJSON(query string, dest any) error {
	cmd := exec.Command("sqlite3", "-json", s.localDBPath, query)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("sqlite3 query error: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	trimmed := bytes.TrimSpace(out)
	if len(trimmed) == 0 {
		return nil
	}
	return json.Unmarshal(trimmed, dest)
}

// TursoArg represents a typed parameter in Hrana over HTTP v2.
type TursoArg struct {
	Type  string `json:"type"`
	Value any    `json:"value,omitempty"`
}

// TursoStmt represents a parameterized SQL statement for Turso /v2/pipeline.
type TursoStmt struct {
	SQL  string     `json:"sql"`
	Args []TursoArg `json:"args,omitempty"`
}

type tursoPipelineReq struct {
	Requests []tursoReqItem `json:"requests"`
}

type tursoReqItem struct {
	Type string     `json:"type"`
	Stmt *TursoStmt `json:"stmt,omitempty"`
}

type tursoPipelineResp struct {
	Results []struct {
		Type  string `json:"type"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error,omitempty"`
		Response *struct {
			Type   string `json:"type"`
			Result *struct {
				Cols []struct {
					Name string `json:"name"`
				} `json:"cols"`
				Rows [][]struct {
					Type  string `json:"type"`
					Value any    `json:"value"`
				} `json:"rows"`
				AffectedRowCount int `json:"affected_row_count"`
			} `json:"result,omitempty"`
		} `json:"response,omitempty"`
	} `json:"results"`
}

func argText(v string) TursoArg {
	return TursoArg{Type: "text", Value: v}
}

func argNullableText(v string) TursoArg {
	if v == "" {
		return TursoArg{Type: "null"}
	}
	return TursoArg{Type: "text", Value: v}
}

func argInt(v int) TursoArg {
	return TursoArg{Type: "integer", Value: strconv.Itoa(v)}
}

func argNullableInt(v *int) TursoArg {
	if v == nil {
		return TursoArg{Type: "null"}
	}
	return TursoArg{Type: "integer", Value: strconv.Itoa(*v)}
}

func argFloat(v float64) TursoArg {
	return TursoArg{Type: "float", Value: v}
}

// ExecTursoBatch executes a slice of SQL statements in batches of 40 against Turso HTTP /v2/pipeline.
func (s *Store) ExecTursoBatch(stmts []TursoStmt, ignoreErrors bool) error {
	if !s.HasTurso() || len(stmts) == 0 {
		return nil
	}
	const batchSize = 40
	for i := 0; i < len(stmts); i += batchSize {
		end := i + batchSize
		if end > len(stmts) {
			end = len(stmts)
		}
		chunk := stmts[i:end]
		reqs := make([]tursoReqItem, 0, len(chunk)+1)
		for idx := range chunk {
			stmtCopy := chunk[idx]
			reqs = append(reqs, tursoReqItem{Type: "execute", Stmt: &stmtCopy})
		}
		reqs = append(reqs, tursoReqItem{Type: "close"})

		payload, err := json.Marshal(tursoPipelineReq{Requests: reqs})
		if err != nil {
			return err
		}

		req, err := http.NewRequest("POST", s.tursoURL+"/v2/pipeline", bytes.NewReader(payload))
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+s.tursoToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return err
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode >= 400 {
			if ignoreErrors {
				continue
			}
			return fmt.Errorf("turso HTTP %d: %s", resp.StatusCode, string(body))
		}

		if !ignoreErrors {
			var parsed tursoPipelineResp
			if err := json.Unmarshal(body, &parsed); err == nil {
				for _, r := range parsed.Results {
					if r.Type == "error" && r.Error != nil {
						if !strings.Contains(r.Error.Message, "already exists") && !strings.Contains(r.Error.Message, "duplicate column") {
							return fmt.Errorf("turso statement error: %s", r.Error.Message)
						}
					}
				}
			}
		}
	}
	return nil
}

// QueryTursoCount runs a `SELECT COUNT(*)` query on Turso Cloud.
func (s *Store) QueryTursoCount(table string) (int, error) {
	if !s.HasTurso() {
		return 0, nil
	}
	stmt := TursoStmt{SQL: "SELECT COUNT(*) FROM " + table}
	payload, _ := json.Marshal(tursoPipelineReq{
		Requests: []tursoReqItem{
			{Type: "execute", Stmt: &stmt},
			{Type: "close"},
		},
	})
	req, err := http.NewRequest("POST", s.tursoURL+"/v2/pipeline", bytes.NewReader(payload))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+s.tursoToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var parsed tursoPipelineResp
	if err := json.Unmarshal(body, &parsed); err != nil {
		return 0, err
	}
	if len(parsed.Results) > 0 && parsed.Results[0].Response != nil && parsed.Results[0].Response.Result != nil {
		rows := parsed.Results[0].Response.Result.Rows
		if len(rows) > 0 && len(rows[0]) > 0 {
			if sVal, ok := rows[0][0].Value.(string); ok {
				return strconv.Atoi(sVal)
			}
		}
	}
	return 0, nil
}

// PullGroupsFromTurso fetches all fb_groups rows from Turso Cloud and upserts them into local SQLite,
// preserving enabled flags, listings_count, and last_scraped_at across ephemeral runners.
func (s *Store) PullGroupsFromTurso() (int, error) {
	if !s.HasTurso() {
		return 0, nil
	}
	stmt := TursoStmt{
		SQL: "SELECT id, name, url, COALESCE(member_count, ''), category, enabled, listings_count, COALESCE(last_scraped_at, '') FROM fb_groups",
	}
	payload, err := json.Marshal(tursoPipelineReq{
		Requests: []tursoReqItem{
			{Type: "execute", Stmt: &stmt},
			{Type: "close"},
		},
	})
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequest("POST", s.tursoURL+"/v2/pipeline", bytes.NewReader(payload))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+s.tursoToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return 0, fmt.Errorf("turso HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed tursoPipelineResp
	if err := json.Unmarshal(body, &parsed); err != nil {
		return 0, err
	}
	if len(parsed.Results) == 0 || parsed.Results[0].Response == nil || parsed.Results[0].Response.Result == nil {
		return 0, nil
	}

	rows := parsed.Results[0].Response.Result.Rows
	if len(rows) == 0 {
		return 0, nil
	}

	var localBuf strings.Builder
	localBuf.WriteString("BEGIN TRANSACTION;\n")
	count := 0
	for _, r := range rows {
		if len(r) < 8 {
			continue
		}
		id := tursoCellStr(r[0].Value)
		name := tursoCellStr(r[1].Value)
		url := tursoCellStr(r[2].Value)
		memberCount := tursoCellStr(r[3].Value)
		category := tursoCellStr(r[4].Value)
		enabled := tursoCellInt(r[5].Value)
		listingsCount := tursoCellInt(r[6].Value)
		lastScrapedAt := tursoCellStr(r[7].Value)
		if id == "" || name == "" {
			continue
		}
		localBuf.WriteString(fmt.Sprintf(
			"INSERT INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, last_scraped_at, updated_at) VALUES (%s, %s, %s, %s, %s, %d, %d, %s, datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, member_count=CASE WHEN excluded.member_count != '' THEN excluded.member_count ELSE fb_groups.member_count END, category=excluded.category, enabled=excluded.enabled, listings_count=MAX(fb_groups.listings_count, excluded.listings_count), last_scraped_at=coalesce(excluded.last_scraped_at, fb_groups.last_scraped_at), updated_at=datetime('now');\n",
			sqlStr(id), sqlStr(name), sqlStr(url), sqlStr(memberCount), sqlStr(category), enabled, listingsCount, sqlNullableStr(lastScrapedAt),
		))
		count++
	}
	localBuf.WriteString("COMMIT;\n")

	if count == 0 {
		return 0, nil
	}
	if err := s.ExecLocal(localBuf.String()); err != nil {
		return 0, err
	}
	return count, nil
}

func tursoCellStr(v any) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return strconv.FormatInt(int64(val), 10)
	default:
		return fmt.Sprintf("%v", val)
	}
}

func tursoCellInt(v any) int {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case string:
		n, _ := strconv.Atoi(val)
		return n
	case float64:
		return int(val)
	default:
		return 0
	}
}

// SeedCuratedGroups seeds the 29 curated Bangalore rental groups into fb_groups.
func (s *Store) SeedCuratedGroups() (int, error) {
	var groups []FBGroup
	for _, cg := range config.CuratedBangaloreGroups {
		enabled := 0
		if cg.Enabled {
			enabled = 1
		}
		groups = append(groups, FBGroup{
			ID:          cg.ID,
			Name:        cg.Name,
			URL:         cg.URL,
			MemberCount: cg.MemberCount,
			Category:    cg.Category,
			Enabled:     enabled,
		})
	}
	return len(groups), s.UpsertGroups(groups)
}

// UpsertGroups persists a slice of FBGroup rows to local SQLite and Turso Cloud.
func (s *Store) UpsertGroups(groups []FBGroup) error {
	if len(groups) == 0 {
		return nil
	}

	var localBuf strings.Builder
	localBuf.WriteString("BEGIN TRANSACTION;\n")
	var tursoStmts []TursoStmt

	upsertSQL := `
INSERT INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, last_scraped_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name=excluded.name,
  url=excluded.url,
  member_count= CASE WHEN excluded.member_count != '' THEN excluded.member_count ELSE fb_groups.member_count END,
  category=excluded.category,
  last_scraped_at=coalesce(excluded.last_scraped_at, fb_groups.last_scraped_at),
  updated_at=datetime('now');`

	for _, g := range groups {
		localBuf.WriteString(fmt.Sprintf(
			"INSERT INTO fb_groups (id, name, url, member_count, category, enabled, listings_count, last_scraped_at, updated_at) VALUES (%s, %s, %s, %s, %s, %d, %d, %s, datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, member_count=CASE WHEN excluded.member_count != '' THEN excluded.member_count ELSE fb_groups.member_count END, category=excluded.category, last_scraped_at=coalesce(excluded.last_scraped_at, fb_groups.last_scraped_at), updated_at=datetime('now');\n",
			sqlStr(g.ID), sqlStr(g.Name), sqlStr(g.URL), sqlStr(g.MemberCount), sqlStr(g.Category), g.Enabled, g.ListingsCount, sqlNullableStr(g.LastScrapedAt),
		))

		tursoStmts = append(tursoStmts, TursoStmt{
			SQL: upsertSQL,
			Args: []TursoArg{
				argText(g.ID),
				argText(g.Name),
				argText(g.URL),
				argText(g.MemberCount),
				argText(g.Category),
				argInt(g.Enabled),
				argInt(g.ListingsCount),
				argNullableText(g.LastScrapedAt),
			},
		})
	}
	localBuf.WriteString("COMMIT;\n")

	if err := s.ExecLocal(localBuf.String()); err != nil {
		return err
	}
	return s.ExecTursoBatch(tursoStmts, false)
}

// GetGroups fetches FBGroup rows from local SQLite.
func (s *Store) GetGroups(onlyEnabled bool) ([]FBGroup, error) {
	query := "SELECT id, name, url, coalesce(member_count, '') as member_count, category, enabled, listings_count, coalesce(last_scraped_at, '') as last_scraped_at FROM fb_groups"
	if onlyEnabled {
		query += " WHERE enabled = 1"
	}
	query += " ORDER BY listings_count DESC, name ASC;"
	var groups []FBGroup
	err := s.QueryLocalJSON(query, &groups)
	return groups, err
}

// IsAuthenticPostURL validates that a post URL is a real Facebook permalink.
func IsAuthenticPostURL(postURL, fbPostID string) bool {
	if !strings.HasPrefix(postURL, "https://www.facebook.com/") {
		return false
	}
	for _, bad := range []string{"fb_", "seed_", "manual_"} {
		if strings.Contains(postURL, bad) {
			return false
		}
	}
	if strings.Contains(strings.ToLower(fbPostID), "seed") {
		return false
	}
	return true
}

// UpsertListings persists a batch of verified ListingRecord rows to local SQLite and Turso Cloud.
func (s *Store) UpsertListings(listings []ListingRecord) error {
	if len(listings) == 0 {
		return nil
	}

	var localBuf strings.Builder
	localBuf.WriteString("BEGIN TRANSACTION;\n")
	var tursoStmts []TursoStmt

	upsertSQL := `
INSERT INTO listings (
  fb_post_id, group_id, group_name, post_url, author_name, posted_time, raw_text,
  location, zone, landmark, society_maps_url, landmark_maps_url, locality_maps_url,
  title, summary, image_urls, bhk_type, rent, deposit, is_brokerage,
  is_gated_society, society_name, has_swimming_pool, has_power_backup,
  has_attached_washroom, has_balcony, furnishing, is_kadubeesanahalli_direct,
  contact_phone, distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
  has_panathur_underpass_bottleneck, score, score_breakdown, tier, user_status,
  created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?,
  coalesce(?, datetime('now')), datetime('now')
)
ON CONFLICT(fb_post_id) DO UPDATE SET
  group_id=coalesce(excluded.group_id, listings.group_id),
  author_name=excluded.author_name,
  posted_time=excluded.posted_time,
  location=excluded.location,
  zone=excluded.zone,
  landmark=excluded.landmark,
  society_maps_url=excluded.society_maps_url,
  landmark_maps_url=excluded.landmark_maps_url,
  locality_maps_url=excluded.locality_maps_url,
  title=excluded.title,
  summary=excluded.summary,
  image_urls=excluded.image_urls,
  rent=excluded.rent,
  deposit=excluded.deposit,
  society_name=excluded.society_name,
  score=excluded.score,
  score_breakdown=excluded.score_breakdown,
  tier=excluded.tier,
  inbound_mins=excluded.inbound_mins,
  outbound_mins=excluded.outbound_mins,
  two_way_avg_peak_mins=excluded.two_way_avg_peak_mins,
  updated_at=datetime('now');`

	validCount := 0
	for _, l := range listings {
		if !IsAuthenticPostURL(l.PostURL, l.FBPostID) {
			continue
		}
		validCount++
		if l.PostedTime == "" {
			l.PostedTime = "Recently"
		}
		if l.Zone == "" {
			l.Zone = gazetteer.ZoneORRBellandur
		}
		if l.ImageURLs == "" {
			l.ImageURLs = "[]"
		}
		if l.UserStatus == "" {
			l.UserStatus = "new"
		}

		localBuf.WriteString(fmt.Sprintf(
			`INSERT INTO listings (
  fb_post_id, group_id, group_name, post_url, author_name, posted_time, raw_text,
  location, zone, landmark, society_maps_url, landmark_maps_url, locality_maps_url,
  title, summary, image_urls, bhk_type, rent, deposit, is_brokerage,
  is_gated_society, society_name, has_swimming_pool, has_power_backup,
  has_attached_washroom, has_balcony, furnishing, is_kadubeesanahalli_direct,
  contact_phone, distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
  has_panathur_underpass_bottleneck, score, score_breakdown, tier, user_status,
  created_at, updated_at
) VALUES (
  %s, %s, %s, %s, %s, %s, %s,
  %s, %s, %s, %s, %s, %s,
  %s, %s, %s, %s, %s, %s, %d,
  %d, %s, %d, %d,
  %d, %d, %s, %d,
  %s, %f, %d, %d, %d,
  %d, %d, %s, %s, %s,
  coalesce(%s, datetime('now')), datetime('now')
) ON CONFLICT(fb_post_id) DO UPDATE SET
  group_id=coalesce(excluded.group_id, listings.group_id),
  author_name=excluded.author_name,
  posted_time=excluded.posted_time,
  location=excluded.location,
  zone=excluded.zone,
  landmark=excluded.landmark,
  society_maps_url=excluded.society_maps_url,
  landmark_maps_url=excluded.landmark_maps_url,
  locality_maps_url=excluded.locality_maps_url,
  title=excluded.title,
  summary=excluded.summary,
  image_urls=excluded.image_urls,
  rent=excluded.rent,
  deposit=excluded.deposit,
  society_name=excluded.society_name,
  score=excluded.score,
  score_breakdown=excluded.score_breakdown,
  tier=excluded.tier,
  inbound_mins=excluded.inbound_mins,
  outbound_mins=excluded.outbound_mins,
  two_way_avg_peak_mins=excluded.two_way_avg_peak_mins,
  updated_at=datetime('now');`+"\n",
			sqlStr(l.FBPostID), sqlNullableStr(l.GroupID), sqlStr(l.GroupName), sqlStr(l.PostURL), sqlStr(l.AuthorName), sqlStr(l.PostedTime), sqlStr(l.RawText),
			sqlStr(l.Location), sqlStr(l.Zone), sqlNullableStr(l.Landmark), sqlNullableStr(l.SocietyMapsURL), sqlNullableStr(l.LandmarkMapsURL), sqlStr(l.LocalityMapsURL),
			sqlNullableStr(l.Title), sqlNullableStr(l.Summary), sqlStr(l.ImageURLs), sqlStr(l.BHKType), sqlNullableInt(l.Rent), sqlNullableInt(l.Deposit), l.IsBrokerage,
			l.IsGatedSociety, sqlNullableStr(l.SocietyName), l.HasSwimmingPool, l.HasPowerBackup,
			l.HasAttachedWashroom, l.HasBalcony, sqlStr(l.Furnishing), l.IsKadubeesanahalliDirect,
			sqlNullableStr(l.ContactPhone), l.DistanceKm, l.InboundMins, l.OutboundMins, l.TwoWayAvgPeakMins,
			l.HasPanathurUnderpassBottleneck, l.Score, sqlStr(l.ScoreBreakdown), sqlStr(l.Tier), sqlStr(l.UserStatus),
			sqlNullableStr(l.CreatedAt),
		))

		tursoStmts = append(tursoStmts, TursoStmt{
			SQL: upsertSQL,
			Args: []TursoArg{
				argText(l.FBPostID),
				argNullableText(l.GroupID),
				argText(l.GroupName),
				argText(l.PostURL),
				argText(l.AuthorName),
				argText(l.PostedTime),
				argText(l.RawText),
				argText(l.Location),
				argText(l.Zone),
				argNullableText(l.Landmark),
				argNullableText(l.SocietyMapsURL),
				argNullableText(l.LandmarkMapsURL),
				argText(l.LocalityMapsURL),
				argNullableText(l.Title),
				argNullableText(l.Summary),
				argText(l.ImageURLs),
				argText(l.BHKType),
				argNullableInt(l.Rent),
				argNullableInt(l.Deposit),
				argInt(l.IsBrokerage),
				argInt(l.IsGatedSociety),
				argNullableText(l.SocietyName),
				argInt(l.HasSwimmingPool),
				argInt(l.HasPowerBackup),
				argInt(l.HasAttachedWashroom),
				argInt(l.HasBalcony),
				argText(l.Furnishing),
				argInt(l.IsKadubeesanahalliDirect),
				argNullableText(l.ContactPhone),
				argFloat(l.DistanceKm),
				argInt(l.InboundMins),
				argInt(l.OutboundMins),
				argInt(l.TwoWayAvgPeakMins),
				argInt(l.HasPanathurUnderpassBottleneck),
				argInt(l.Score),
				argText(l.ScoreBreakdown),
				argText(l.Tier),
				argText(l.UserStatus),
				argNullableText(l.CreatedAt),
			},
		})
	}
	localBuf.WriteString("COMMIT;\n")

	if validCount == 0 {
		return nil
	}
	if err := s.ExecLocal(localBuf.String()); err != nil {
		return err
	}
	return s.ExecTursoBatch(tursoStmts, false)
}

// GetAllListings loads all listings from local SQLite.
func (s *Store) GetAllListings() ([]ListingRecord, error) {
	query := `SELECT
  id, fb_post_id, coalesce(group_id, '') as group_id, group_name, post_url,
  author_name, coalesce(posted_time, 'Recently') as posted_time, raw_text,
  location, coalesce(zone, 'ORR & Bellandur') as zone,
  coalesce(landmark, '') as landmark,
  coalesce(society_maps_url, '') as society_maps_url,
  coalesce(landmark_maps_url, '') as landmark_maps_url,
  coalesce(locality_maps_url, '') as locality_maps_url,
  coalesce(title, '') as title,
  coalesce(summary, '') as summary,
  coalesce(image_urls, '[]') as image_urls,
  bhk_type, rent, deposit, is_brokerage, is_gated_society,
  coalesce(society_name, '') as society_name,
  has_swimming_pool, has_power_backup, has_attached_washroom, has_balcony,
  furnishing, is_kadubeesanahalli_direct,
  coalesce(contact_phone, '') as contact_phone,
  distance_km, inbound_mins, outbound_mins, two_way_avg_peak_mins,
  has_panathur_underpass_bottleneck, score, score_breakdown, tier,
  user_status, created_at, updated_at
FROM listings ORDER BY id ASC;`
	var rows []ListingRecord
	err := s.QueryLocalJSON(query, &rows)
	return rows, err
}

var postURLGroupRe = regexp.MustCompile(`/groups/([^/?#]+)`)

// ExtractGroupIDFromURL extracts the Facebook group ID or slug from a post or group URL.
func ExtractGroupIDFromURL(rawURL string) string {
	m := postURLGroupRe.FindStringSubmatch(rawURL)
	if len(m) > 1 {
		return m[1]
	}
	return ""
}

// BackfillAndSync seeds fb_groups, backfills zone + Google Maps URLs + normalized 0-100 scores on all local listings, and syncs everything to Turso Cloud.
func (s *Store) BackfillAndSync() (*SyncStats, error) {
	if err := s.InitSchema(); err != nil {
		return nil, err
	}

	if s.HasTurso() {
		_, _ = s.PullGroupsFromTurso()
	}

	if _, err := s.SeedCuratedGroups(); err != nil {
		return nil, err
	}

	groups, err := s.GetGroups(false)
	if err != nil {
		return nil, err
	}
	groupNameMap := map[string]string{}
	for _, g := range groups {
		groupNameMap[strings.ToLower(g.Name)] = g.ID
	}

	rows, err := s.GetAllListings()
	if err != nil {
		return nil, err
	}

	backfilled := make([]ListingRecord, 0, len(rows))
	for _, r := range rows {
		if !IsAuthenticPostURL(r.PostURL, r.FBPostID) {
			continue
		}
		place := gazetteer.ResolvePlace(r.RawText + "\n" + r.Location + "\n" + r.SocietyName)

		if r.Location == "" || r.Location == "Bengaluru" {
			r.Location = place.Locality
		}
		if place.Zone != "" {
			r.Zone = place.Zone
		} else if r.Zone == "" {
			r.Zone = gazetteer.ZoneORRBellandur
		}

		// Clean multi-line corrupted society names or landmarks from earlier scrapes
		if strings.Contains(r.SocietyName, "\n") || strings.EqualFold(r.SocietyName, "in a standalone gated apartment") {
			r.SocietyName = place.SocietyName
		} else if r.SocietyName == "" && place.SocietyName != "" {
			r.SocietyName = place.SocietyName
		}

		if strings.Contains(r.Landmark, "\n") {
			r.Landmark = place.Landmark
		} else if r.Landmark == "" && place.Landmark != "" {
			r.Landmark = place.Landmark
		}

		r.SocietyMapsURL = gazetteer.BuildSocietyMapsURL(r.SocietyName, r.Location)
		r.LandmarkMapsURL = gazetteer.BuildLandmarkMapsURL(r.Landmark, r.Location)
		r.LocalityMapsURL = gazetteer.BuildLocalityMapsURL(r.Location)

		if r.GroupID == "" {
			r.GroupID = ExtractGroupIDFromURL(r.PostURL)
			if r.GroupID == "" {
				r.GroupID = groupNameMap[strings.ToLower(r.GroupName)]
			}
		}

		// Normalize score into [0, 100] and ensure 14-field breakdown
		ent := extractor.ExtractEntities(r.RawText, nil)
		if r.Rent == nil && ent.Rent != nil {
			r.Rent = ent.Rent
		}
		if r.Deposit == nil && ent.Deposit != nil {
			r.Deposit = ent.Deposit
		}
		scored := scorer.ScoreListing(ent)
		r.Score = scored.Score
		r.Tier = scored.Tier
		if bdBytes, err := json.Marshal(scored.Breakdown); err == nil {
			r.ScoreBreakdown = string(bdBytes)
		}

		backfilled = append(backfilled, r)
	}

	if err := s.UpsertListings(backfilled); err != nil {
		return nil, err
	}

	// Update listings_count in fb_groups without zeroing out counts on ephemeral runners
	countUpdateSQL := `UPDATE fb_groups SET listings_count = MAX(listings_count, (
		SELECT COUNT(*) FROM listings WHERE listings.group_id = fb_groups.id OR listings.group_name = fb_groups.name
	));`
	_ = s.ExecLocal(countUpdateSQL)
	if s.HasTurso() {
		_ = s.ExecTursoBatch([]TursoStmt{{SQL: countUpdateSQL}}, true)
	}

	// Re-sync updated groups to Turso
	updatedGroups, _ := s.GetGroups(false)
	_ = s.UpsertGroups(updatedGroups)

	tursoListings, _ := s.QueryTursoCount("listings")
	tursoGroups, _ := s.QueryTursoCount("fb_groups")

	return &SyncStats{
		GroupsSynced:       len(updatedGroups),
		ListingsBackfilled: len(backfilled),
		ListingsSynced:     len(backfilled),
		TursoTotalListings: tursoListings,
		TursoTotalGroups:   tursoGroups,
	}, nil
}

// LogScrapeRun records a scrape cycle entry in scrape_logs on local SQLite and Turso Cloud.
func (s *Store) LogScrapeRun(status string, scanned, matched, groupsScanned int, errMsg string) error {
	localSQL := fmt.Sprintf(
		"INSERT INTO scrape_logs (status, items_scanned, items_matched, groups_scanned, error_message) VALUES (%s, %d, %d, %d, %s);",
		sqlStr(status), scanned, matched, groupsScanned, sqlNullableStr(errMsg),
	)
	_ = s.ExecLocal(localSQL)
	if s.HasTurso() {
		stmt := TursoStmt{
			SQL: "INSERT INTO scrape_logs (status, items_scanned, items_matched, groups_scanned, error_message) VALUES (?, ?, ?, ?, ?)",
			Args: []TursoArg{
				argText(status),
				argInt(scanned),
				argInt(matched),
				argInt(groupsScanned),
				argNullableText(errMsg),
			},
		}
		return s.ExecTursoBatch([]TursoStmt{stmt}, true)
	}
	return nil
}

func sqlStr(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func sqlNullableStr(s string) string {
	if s == "" {
		return "NULL"
	}
	return sqlStr(s)
}

func sqlNullableInt(v *int) string {
	if v == nil {
		return "NULL"
	}
	return strconv.Itoa(*v)
}
