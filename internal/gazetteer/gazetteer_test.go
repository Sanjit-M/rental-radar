package gazetteer

import (
	"strings"
	"testing"
)

func TestResolvePlaceAcrossBangaloreZones(t *testing.T) {
	tests := []struct {
		name         string
		text         string
		wantLocality string
		wantZone     string
		wantSociety  string
		wantLandmark string
	}{
		{
			name:         "Harlur Prestige Ferns Residency with HSR landmark",
			text:         "1 room available in 3BHK in Prestige Ferns Residency, Harlur Road near HSR Layout. Rent 21k",
			wantLocality: "Harlur",
			wantZone:     ZoneSarjapurHarlur,
			wantSociety:  "Prestige Ferns Residency",
			wantLandmark: "HSR Layout",
		},
		{
			name:         "Kadubeesanahalli Sobha Iris near PTP",
			text:         "Master bedroom in Sobha Iris near Cessna Business Park, Kadubeesanahalli",
			wantLocality: "Devarabisanahalli",
			wantZone:     ZoneORRBellandur,
			wantSociety:  "Sobha Iris",
			wantLandmark: "Cessna Business Park",
		},
		{
			name:         "Indiranagar 100ft road listing",
			text:         "Spacious 2BHK in Indiranagar behind Metro Station. Rent 28k",
			wantLocality: "Indiranagar",
			wantZone:     ZoneIndiranagarCentral,
			wantSociety:  "",
			wantLandmark: "Metro Station",
		},
		{
			name:         "Whitefield Prestige Shantiniketan",
			text:         "Flatmate needed in Prestige Shantiniketan, Whitefield opposite Forum Value Mall",
			wantLocality: "Whitefield",
			wantZone:     ZoneWhitefieldEast,
			wantSociety:  "Prestige Shantiniketan",
			wantLandmark: "Forum Value Mall",
		},
		{
			name:         "South Bangalore Jayanagar",
			text:         "1BHK independent flat in Jayanagar close to Madhavan Park",
			wantLocality: "Jayanagar",
			wantZone:     ZoneSouthBangalore,
			wantSociety:  "",
			wantLandmark: "Madhavan Park",
		},
		{
			name:         "North Bangalore Manyata Tech Park Hebbal",
			text:         "Room available in 3BHK at Karle Zenith, Nagawara near Manyata Tech Park",
			wantLocality: "Nagawara",
			wantZone:     ZoneNorthHebbal,
			wantSociety:  "Karle Zenith",
			wantLandmark: "Manyata Tech Park",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := ResolvePlace(tc.text)
			if got.Locality != tc.wantLocality {
				t.Errorf("Locality = %q, want %q", got.Locality, tc.wantLocality)
			}
			if got.Zone != tc.wantZone {
				t.Errorf("Zone = %q, want %q", got.Zone, tc.wantZone)
			}
			if got.SocietyName != tc.wantSociety {
				t.Errorf("SocietyName = %q, want %q", got.SocietyName, tc.wantSociety)
			}
			if got.Landmark != tc.wantLandmark {
				t.Errorf("Landmark = %q, want %q", got.Landmark, tc.wantLandmark)
			}
			if !strings.HasPrefix(got.LocalityMapsURL, "https://www.google.com/maps/search/?api=1&query=") {
				t.Errorf("LocalityMapsURL invalid: %q", got.LocalityMapsURL)
			}
			if tc.wantSociety != "" && !strings.HasPrefix(got.SocietyMapsURL, "https://www.google.com/maps/search/?api=1&query=") {
				t.Errorf("SocietyMapsURL invalid: %q", got.SocietyMapsURL)
			}
			if tc.wantLandmark != "" && !strings.HasPrefix(got.LandmarkMapsURL, "https://www.google.com/maps/search/?api=1&query=") {
				t.Errorf("LandmarkMapsURL invalid: %q", got.LandmarkMapsURL)
			}
		})
	}
}
