package extractor

import (
	"testing"
)

func TestExtractEntities(t *testing.T) {
	sample := "1 room available in 3BHK in Prestige Ferns Residency, Harlur Road near HSR Layout. Rent 21k, deposit 50k, zero brokerage, attached washroom, swimming pool, power backup, fully furnished. Contact 9845012345"
	ent := ExtractEntities(sample, nil)

	if ent.Rent == nil || *ent.Rent != 21000 {
		t.Fatalf("expected rent 21000, got %v", ent.Rent)
	}
	if ent.Deposit == nil || *ent.Deposit != 50000 {
		t.Fatalf("expected deposit 50000, got %v", ent.Deposit)
	}
	if ent.BHKType != "3 BHK (Shared/Full)" {
		t.Errorf("expected BHKType '3 BHK (Shared/Full)', got %q", ent.BHKType)
	}
	if ent.IsBrokerage {
		t.Errorf("expected IsBrokerage=false")
	}
	if !ent.IsGatedSociety || ent.SocietyName != "Prestige Ferns Residency" {
		t.Errorf("expected Prestige Ferns Residency gated society, got %q (%v)", ent.SocietyName, ent.IsGatedSociety)
	}
	if ent.Location != "Harlur" || ent.Zone != "Sarjapur & Harlur" {
		t.Errorf("expected Harlur / Sarjapur & Harlur, got %q / %q", ent.Location, ent.Zone)
	}
	if ent.Landmark != "HSR Layout" {
		t.Errorf("expected Landmark 'HSR Layout', got %q", ent.Landmark)
	}
	if !ent.HasSwimmingPool || !ent.HasPowerBackup || !ent.HasAttachedWashroom {
		t.Errorf("expected pool, power backup, attached washroom all true")
	}
	if ent.Furnishing != "Fully Furnished" {
		t.Errorf("expected Fully Furnished, got %q", ent.Furnishing)
	}
	if ent.ContactPhone != "9845012345" {
		t.Errorf("expected phone 9845012345, got %q", ent.ContactPhone)
	}
	if !ent.IsRentalOffering {
		t.Errorf("expected IsRentalOffering=true")
	}
}
