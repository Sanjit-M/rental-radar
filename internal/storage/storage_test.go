package storage

import (
	"path/filepath"
	"testing"

	"github.com/Sanjit-M/rental-radar/internal/config"
)

func TestLocalSQLiteStoreInitAndUpsert(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_listings.db")

	cfg := &config.Config{
		LocalDBPath:      dbPath,
		TursoDatabaseURL: "",
		TursoAuthToken:   "",
	}
	store := New(cfg)

	if err := store.InitSchema(); err != nil {
		t.Fatalf("InitSchema failed: %v", err)
	}

	seeded, err := store.SeedCuratedGroups()
	if err != nil {
		t.Fatalf("SeedCuratedGroups failed: %v", err)
	}
	if seeded != 29 {
		t.Errorf("expected 29 seeded groups, got %d", seeded)
	}

	groups, err := store.GetGroups(true)
	if err != nil {
		t.Fatalf("GetGroups failed: %v", err)
	}
	if len(groups) != 29 {
		t.Errorf("expected 29 enabled groups in SQLite, got %d", len(groups))
	}

	rent := 21000
	deposit := 50000
	rec := ListingRecord{
		FBPostID:        "1234567890",
		GroupID:         "591413389157630",
		GroupName:       "Flat and Flatmates Bellandur, Kadubeesanahalli (200k)",
		PostURL:         "https://www.facebook.com/groups/591413389157630/posts/1234567890/",
		AuthorName:      "Rahul Sharma",
		PostedTime:      "16 Oct 2026, 10:30 AM IST",
		RawText:         "1 room available in 3BHK in Prestige Ferns Residency, Harlur Road near HSR Layout. Rent 21k, deposit 50k, zero brokerage.",
		Location:        "Harlur",
		Zone:            "Sarjapur & Harlur",
		Landmark:        "HSR Layout",
		SocietyMapsURL:  "https://www.google.com/maps/search/?api=1&query=Prestige+Ferns+Residency%2C+Harlur%2C+Bengaluru",
		LandmarkMapsURL: "https://www.google.com/maps/search/?api=1&query=HSR+Layout%2C+Harlur%2C+Bengaluru",
		LocalityMapsURL: "https://www.google.com/maps/search/?api=1&query=Harlur%2C+Bengaluru",
		Title:           "3 BHK (Shared/Full) in Prestige Ferns Residency",
		Summary:         "1 room available in 3BHK in Prestige Ferns Residency",
		ImageURLs:       "[]",
		BHKType:         "3 BHK (Shared/Full)",
		Rent:            &rent,
		Deposit:         &deposit,
		IsGatedSociety:  1,
		SocietyName:     "Prestige Ferns Residency",
		HasSwimmingPool: 1,
		HasPowerBackup:  1,
		Furnishing:      "Fully Furnished",
		Score:           95,
		ScoreBreakdown:  `{"base":50,"rent":20}`,
		Tier:            "🔥 Unicorn Deal",
		UserStatus:      "new",
	}

	if err := store.UpsertListings([]ListingRecord{rec}); err != nil {
		t.Fatalf("UpsertListings failed: %v", err)
	}

	all, err := store.GetAllListings()
	if err != nil {
		t.Fatalf("GetAllListings failed: %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("expected 1 listing, got %d", len(all))
	}
	if all[0].Zone != "Sarjapur & Harlur" || all[0].SocietyName != "Prestige Ferns Residency" {
		t.Errorf("unexpected listing row: %+v", all[0])
	}
}
