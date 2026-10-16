package scorer

import (
	"encoding/json"
	"testing"

	"github.com/Sanjit-M/rental-radar/internal/extractor"
)

func TestScoreListingUnicornAndLowMatch(t *testing.T) {
	unicornText := "1 room available in 3BHK in Prestige Ferns Residency, Harlur Road near HSR Layout. Rent 21k, deposit 50k, zero brokerage, attached washroom, swimming pool, power backup, fully furnished. Contact 9845012345"
	ent := extractor.ExtractEntities(unicornText, nil)
	res := ScoreListing(ent)

	if res.Score < 90 || res.Score > 100 {
		t.Errorf("expected Unicorn score in [90, 100], got %d", res.Score)
	}
	if res.Tier != "🔥 Unicorn Deal" {
		t.Errorf("expected tier '🔥 Unicorn Deal', got %q", res.Tier)
	}

	// Verify all 14 JSON keys serialize cleanly
	rawJSON, err := json.Marshal(res.Breakdown)
	if err != nil {
		t.Fatalf("failed to marshal breakdown: %v", err)
	}
	var m map[string]int
	if err := json.Unmarshal(rawJSON, &m); err != nil {
		t.Fatalf("failed to unmarshal breakdown map: %v", err)
	}
	expectedKeys := []string{
		"base", "rent", "brokerage", "deposit", "gatedSociety",
		"swimmingPool", "powerBackup", "attachedWashroom", "vegetarianPenalty",
		"bachelorMatch", "walkProximity", "furnished", "panathurBypass", "commute",
	}
	for _, k := range expectedKeys {
		if _, ok := m[k]; !ok {
			t.Errorf("missing expected key %q in ScoringBreakdown JSON", k)
		}
	}

	lowText := "1BHK in Panathur after railway underpass. Rent 36k, deposit 150k, brokerage applicable, veg only, female only."
	lowEnt := extractor.ExtractEntities(lowText, nil)
	lowRes := ScoreListing(lowEnt)
	if lowRes.Score != 0 || lowRes.Tier != "⚠️ Low Match" {
		t.Errorf("expected score 0 and Low Match tier, got %d (%s)", lowRes.Score, lowRes.Tier)
	}
}
