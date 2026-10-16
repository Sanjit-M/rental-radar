package gazetteer

import (
	"net/url"
	"regexp"
	"strings"
)

// Bangalore Zones
const (
	ZoneORRBellandur       = "ORR & Bellandur"
	ZoneHSRKoramangala     = "HSR & Koramangala"
	ZoneIndiranagarCentral = "Indiranagar & Central"
	ZoneWhitefieldEast     = "Whitefield & East"
	ZoneSarjapurHarlur     = "Sarjapur & Harlur"
	ZoneSouthBangalore     = "South Bangalore"
	ZoneNorthHebbal        = "North & Hebbal"
	ZoneBangaloreGeneral   = "Bangalore General"
)

// PTPAnchorLat and PTPAnchorLon represent Prestige Tech Park (Kadubeesanahalli Main Gate).
const (
	PTPAnchorLat = 12.9385
	PTPAnchorLon = 77.6917
)

// KnownSociety describes a verified gated apartment society in Bangalore.
type KnownSociety struct {
	Key                      string
	Name                     string
	Locality                 string
	Zone                     string
	HasPool                  bool
	IsGated                  bool
	HasPowerBackup           bool
	IsKadubeesanahalliDirect bool
	Lat                      float64
	Lon                      float64
}

// LocalityInfo describes a Bangalore neighborhood / tech corridor.
type LocalityInfo struct {
	CanonicalName string
	Zone          string
	Aliases       []string
	Lat           float64
	Lon           float64
	IsDirect      bool
}

// PlaceResolution holds the resolved geographic and Google Maps metadata for a listing.
type PlaceResolution struct {
	Locality                 string  `json:"locality"`
	Zone                     string  `json:"zone"`
	SocietyName              string  `json:"societyName,omitempty"`
	Landmark                 string  `json:"landmark,omitempty"`
	IsGatedSociety           bool    `json:"isGatedSociety"`
	HasSwimmingPool          bool    `json:"hasSwimmingPool"`
	HasPowerBackup           bool    `json:"hasPowerBackup"`
	IsKadubeesanahalliDirect bool    `json:"isKadubeesanahalliDirect"`
	Lat                      float64 `json:"lat"`
	Lon                      float64 `json:"lon"`
	SocietyMapsURL           string  `json:"societyMapsUrl,omitempty"`
	LandmarkMapsURL          string  `json:"landmarkMapsUrl,omitempty"`
	LocalityMapsURL          string  `json:"localityMapsUrl"`
}

// KnownSocieties catalogs 55+ major gated societies across all Bangalore zones.
var KnownSocieties = []KnownSociety{
	// ORR & Bellandur
	{Key: "sobhairis", Name: "Sobha Iris", Locality: "Devarabisanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9372, Lon: 77.6934},
	{Key: "sobhahibiscus", Name: "Sobha Hibiscus", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9358, Lon: 77.6948},
	{Key: "sobhajasmine", Name: "Sobha Jasmine", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9365, Lon: 77.6955},
	{Key: "assetzmarq", Name: "Assetz Marq", Locality: "Kadubeesanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9410, Lon: 77.6960},
	{Key: "assetzeastpoint", Name: "Assetz East Point", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9422, Lon: 77.6980},
	{Key: "orchidlakeview", Name: "Goyal Orchid Lakeview", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9320, Lon: 77.6890},
	{Key: "prestigesunnyside", Name: "Prestige Sunnyside", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9390, Lon: 77.6950},
	{Key: "divyasree77east", Name: "Divyasree 77 East", Locality: "Yemalur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9450, Lon: 77.6880},
	{Key: "sjrparkway", Name: "SJR Parkway Homes", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9315, Lon: 77.6920},
	{Key: "salarpuriasattva", Name: "Salarpuria Sattva", Locality: "Kadubeesanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9360, Lon: 77.6900},
	{Key: "salarpuriasanctity", Name: "Salarpuria Sanctity", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9345, Lon: 77.6895},
	{Key: "adarshpalmretreat", Name: "Adarsh Palm Retreat", Locality: "Devarabisanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9280, Lon: 77.6860},
	{Key: "adarshpalm", Name: "Adarsh Palm Retreat", Locality: "Devarabisanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9280, Lon: 77.6860},
	{Key: "rohanjharoka", Name: "Rohan Jharoka", Locality: "Yemalur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9430, Lon: 77.6850},
	{Key: "godrejreflections", Name: "Godrej Reflections", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9305, Lon: 77.6875},
	{Key: "snnrajlakeview", Name: "SNN Raj Lakeview", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9290, Lon: 77.6840},
	{Key: "brenunity", Name: "Bren Unity", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9335, Lon: 77.6975},
	{Key: "dsrwaterscape", Name: "DSR Waterscape", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9312, Lon: 77.6955},
	{Key: "mantriespana", Name: "Mantri Espana", Locality: "Devarabisanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9300, Lon: 77.6930},
	{Key: "vaswanireserve", Name: "Vaswani Reserve", Locality: "Kadubeesanahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9350, Lon: 77.6990},
	{Key: "umiyacity", Name: "Umiya City / Velocity", Locality: "Kadubeesanahalli", Zone: ZoneORRBellandur, HasPool: false, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9375, Lon: 77.6910},
	{Key: "embassypristine", Name: "Embassy Pristine", Locality: "Bellandur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9225, Lon: 77.6695},
	{Key: "prestigejade", Name: "Prestige Jade Pavilion", Locality: "Marathahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9445, Lon: 77.7010},
	{Key: "prestigekewgardens", Name: "Prestige Kew Gardens", Locality: "Yemalur", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9485, Lon: 77.6845},
	{Key: "rohanvasantha", Name: "Rohan Vasantha", Locality: "Marathahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9560, Lon: 77.7040},
	{Key: "rohanikskha", Name: "Rohan Iksha", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9325, Lon: 77.6960},
	{Key: "rohaniksha", Name: "Rohan Iksha", Locality: "Boganahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9325, Lon: 77.6960},
	{Key: "purvafountainsquare", Name: "Purva Fountain Square", Locality: "Marathahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9535, Lon: 77.7015},
	{Key: "purvariviera", Name: "Purva Riviera", Locality: "Marathahalli", Zone: ZoneORRBellandur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9550, Lon: 77.7050},

	// Sarjapur & Harlur
	{Key: "prestigefernsresidency", Name: "Prestige Ferns Residency", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9056, Lon: 77.6615},
	{Key: "prestigeferns", Name: "Prestige Ferns Residency", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9056, Lon: 77.6615},
	{Key: "purvaskywood", Name: "Purva Skywood", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9020, Lon: 77.6590},
	{Key: "snnrajetternia", Name: "SNN Raj Etternia", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9070, Lon: 77.6640},
	{Key: "ndpassion", Name: "ND Passion", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9010, Lon: 77.6580},
	{Key: "sjrwatermark", Name: "SJR Watermark", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9085, Lon: 77.6635},
	{Key: "sjrverity", Name: "SJR Verity", Locality: "Kasavanahalli", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9040, Lon: 77.6760},
	{Key: "sobhacinnamon", Name: "Sobha Cinnamon", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9095, Lon: 77.6650},
	{Key: "sobhaclassic", Name: "Sobha Classic", Locality: "Harlur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9110, Lon: 77.6660},
	{Key: "sobharoyalpavilion", Name: "Sobha Royal Pavilion", Locality: "Sarjapur Road", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8920, Lon: 77.7180},
	{Key: "sobhadreamacres", Name: "Sobha Dream Acres", Locality: "Panathur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: false, Lat: 12.9365, Lon: 77.7175},
	{Key: "panathuroasis", Name: "Panathur Gated Society", Locality: "Panathur", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: false, Lat: 12.9340, Lon: 77.7010},
	{Key: "purvawhitehall", Name: "Purva Whitehall", Locality: "Sarjapur Road", Zone: ZoneSarjapurHarlur, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9195, Lon: 77.6685},

	// HSR & Koramangala
	{Key: "sobhadaffodil", Name: "Sobha Daffodil", Locality: "HSR Layout", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9035, Lon: 77.6485},
	{Key: "purvafairmont", Name: "Purva Fairmont", Locality: "HSR Layout", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9050, Lon: 77.6495},
	{Key: "nagarjunagreenridge", Name: "Nagarjuna Green Ridge", Locality: "HSR Layout", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9125, Lon: 77.6440},
	{Key: "salarpuriagreenage", Name: "Salarpuria Greenage", Locality: "Bommanahalli", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9015, Lon: 77.6320},
	{Key: "prestigestjohnswood", Name: "Prestige St Johns Wood", Locality: "Koramangala", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9330, Lon: 77.6140},
	{Key: "prestigepinwood", Name: "Prestige Pinewood", Locality: "Koramangala", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9365, Lon: 77.6245},
	{Key: "prestigeacropolis", Name: "Prestige Acropolis", Locality: "Koramangala", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9345, Lon: 77.6115},
	{Key: "mantriclassic", Name: "Mantri Classic", Locality: "Koramangala", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9295, Lon: 77.6315},

	// Whitefield & East
	{Key: "prestigeshantiniketan", Name: "Prestige Shantiniketan", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9895, Lon: 77.7280},
	{Key: "prestigelakesidehabitat", Name: "Prestige Lakeside Habitat", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: false, Lat: 12.9415, Lon: 77.7425},
	{Key: "brigadecosmopolis", Name: "Brigade Cosmopolis", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9685, Lon: 77.7450},
	{Key: "brigademetropolis", Name: "Brigade Metropolis", Locality: "Mahadevapura", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9920, Lon: 77.7030},
	{Key: "brigadelakefront", Name: "Brigade Lakefront", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9785, Lon: 77.7160},
	{Key: "adarshpalmmeadows", Name: "Adarsh Palm Meadows", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9625, Lon: 77.7380},
	{Key: "totalenvironmentwindmills", Name: "Total Environment Windmills", Locality: "Whitefield", Zone: ZoneWhitefieldEast, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9810, Lon: 77.7295},

	// Indiranagar & Central
	{Key: "adarshesplanade", Name: "Adarsh Esplanade", Locality: "HSR Layout", Zone: ZoneHSRKoramangala, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9150, Lon: 77.6480},
	{Key: "diamonddistrict", Name: "Diamond District", Locality: "Domlur", Zone: ZoneIndiranagarCentral, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.9592, Lon: 77.6435},
	{Key: "brigadegateway", Name: "Brigade Gateway", Locality: "Rajajinagar", Zone: ZoneIndiranagarCentral, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 13.0120, Lon: 77.5550},

	// South Bangalore
	{Key: "prestigefalconcity", Name: "Prestige Falcon City", Locality: "Kanakapura Road", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8855, Lon: 77.5465},
	{Key: "brigademillennium", Name: "Brigade Millennium", Locality: "JP Nagar", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8915, Lon: 77.5835},
	{Key: "mantriserenity", Name: "Mantri Serenity", Locality: "Kanakapura Road", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8810, Lon: 77.5450},
	{Key: "snnrajserenity", Name: "SNN Raj Serenity", Locality: "Begur", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8685, Lon: 77.6245},
	{Key: "ajmerainfinity", Name: "Ajmera Infinity", Locality: "Electronic City", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8415, Lon: 77.6580},
	{Key: "ltsouthcity", Name: "L&T South City", Locality: "Bannerghatta Road", Zone: ZoneSouthBangalore, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 12.8885, Lon: 77.5965},

	// North & Hebbal
	{Key: "purvavenezia", Name: "Purva Venezia", Locality: "Yelahanka", Zone: ZoneNorthHebbal, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 13.1055, Lon: 77.5810},
	{Key: "mantriwebcity", Name: "Mantri Webcity", Locality: "Hennur", Zone: ZoneNorthHebbal, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 13.0650, Lon: 77.6480},
	{Key: "karlezenith", Name: "Karle Zenith", Locality: "Nagawara", Zone: ZoneNorthHebbal, HasPool: true, IsGated: true, HasPowerBackup: true, IsKadubeesanahalliDirect: true, Lat: 13.0435, Lon: 77.6195},
}

// Localities catalogs 50+ Bangalore neighborhoods and tech corridors across all 8 zones.
var Localities = []LocalityInfo{
	// ORR & Bellandur
	{CanonicalName: "Kadubeesanahalli", Zone: ZoneORRBellandur, Aliases: []string{"kadubeesanahalli", "kadubisanahalli", "kadhubesanahalli", "kadubeesanhalli", "kadubisanahali", "kadubeesanahali"}, Lat: 12.9380, Lon: 77.6925, IsDirect: true},
	{CanonicalName: "Prestige Tech Park", Zone: ZoneORRBellandur, Aliases: []string{"prestige tech park", "ptp back gate", "ptp main gate", "ptp"}, Lat: 12.9385, Lon: 77.6917, IsDirect: true},
	{CanonicalName: "Cessna Business Park", Zone: ZoneORRBellandur, Aliases: []string{"cessna business park", "cessna park", "cessna"}, Lat: 12.9368, Lon: 77.6910, IsDirect: true},
	{CanonicalName: "Embassy Tech Village", Zone: ZoneORRBellandur, Aliases: []string{"embassy tech village", "etv"}, Lat: 12.9295, Lon: 77.6890, IsDirect: true},
	{CanonicalName: "RMZ Ecoworld", Zone: ZoneORRBellandur, Aliases: []string{"rmz ecoworld", "ecoworld", "rmz ecospace", "ecospace"}, Lat: 12.9260, Lon: 77.6850, IsDirect: true},
	{CanonicalName: "Devarabisanahalli", Zone: ZoneORRBellandur, Aliases: []string{"devarabisanahalli", "devarabeesanahalli", "devarabisana halli", "devarabeesanhalli", "devarabisanahali", "sakra hospital", "sakra world hospital"}, Lat: 12.9300, Lon: 77.6880, IsDirect: true},
	{CanonicalName: "Boganahalli", Zone: ZoneORRBellandur, Aliases: []string{"boganahalli", "bhoganahalli", "boganahali", "bhoganahali"}, Lat: 12.9310, Lon: 77.6970, IsDirect: true},
	{CanonicalName: "Kariyammana Agrahara", Zone: ZoneORRBellandur, Aliases: []string{"kariyammana agrahara", "kariyammana", "kariyamma agrahara"}, Lat: 12.9345, Lon: 77.6950, IsDirect: true},
	{CanonicalName: "Kaveriappa Layout", Zone: ZoneORRBellandur, Aliases: []string{"kaveriappa layout", "kaveriappa"}, Lat: 12.9365, Lon: 77.6930, IsDirect: true},
	{CanonicalName: "Bellandur", Zone: ZoneORRBellandur, Aliases: []string{"bellandur", "green glen layout", "green glen"}, Lat: 12.9304, Lon: 77.6784, IsDirect: true},
	{CanonicalName: "Marathahalli", Zone: ZoneORRBellandur, Aliases: []string{"marathahalli", "marathalli", "marathahali", "marathali", "munnekollal", "spice garden", "aswath nagar", "kartik nagar"}, Lat: 12.9460, Lon: 77.6980, IsDirect: true},
	{CanonicalName: "Yemalur", Zone: ZoneORRBellandur, Aliases: []string{"yemalur", "yamalur", "kempapura"}, Lat: 12.9450, Lon: 77.6750, IsDirect: true},
	{CanonicalName: "Doddanekundi", Zone: ZoneORRBellandur, Aliases: []string{"doddanekundi", "doddanekkundi", "bagmane constellation", "ferns city"}, Lat: 12.9715, Lon: 77.6965, IsDirect: true},
	{CanonicalName: "Mahadevapura", Zone: ZoneORRBellandur, Aliases: []string{"mahadevapura", "bagmane world technology", "bwtc"}, Lat: 12.9905, Lon: 77.6895, IsDirect: true},
	{CanonicalName: "Outer Ring Road", Zone: ZoneORRBellandur, Aliases: []string{"outer ring road", "orr"}, Lat: 12.9350, Lon: 77.6920, IsDirect: true},

	// Sarjapur & Harlur
	{CanonicalName: "Harlur", Zone: ZoneSarjapurHarlur, Aliases: []string{"harlur road", "haralur road", "harlur", "haralur", "silver county", "reliaable"}, Lat: 12.9056, Lon: 77.6615, IsDirect: true},
	{CanonicalName: "Kasavanahalli", Zone: ZoneSarjapurHarlur, Aliases: []string{"kasavanahalli", "kaikondrahalli", "hado siddapura", "hadosiddapura", "choodasandra"}, Lat: 12.9040, Lon: 77.6760, IsDirect: true},
	{CanonicalName: "Sarjapur Road", Zone: ZoneSarjapurHarlur, Aliases: []string{"sarjapur road", "sarjapura road", "sarjapur", "sarjapura", "carmelaram", "ambalipura", "iblur", "doddakannelli", "wipro kodathi"}, Lat: 12.9120, Lon: 77.6850, IsDirect: true},
	{CanonicalName: "Panathur", Zone: ZoneSarjapurHarlur, Aliases: []string{"panathur road", "panathur", "balagere"}, Lat: 12.9350, Lon: 77.7000, IsDirect: false},

	// HSR & Koramangala
	{CanonicalName: "HSR Layout", Zone: ZoneHSRKoramangala, Aliases: []string{"hsr layout", "hsr sector", "hsr", "agara", "parangipalya", "somasundarapalya", "iti layout"}, Lat: 12.9121, Lon: 77.6446, IsDirect: true},
	{CanonicalName: "Koramangala", Zone: ZoneHSRKoramangala, Aliases: []string{"koramangala", "kormangala", "st bed layout", "st bed", "jakkasandra", "ejipura", "sony signal", "sony world"}, Lat: 12.9352, Lon: 77.6245, IsDirect: true},
	{CanonicalName: "BTM Layout", Zone: ZoneHSRKoramangala, Aliases: []string{"btm layout", "btm 1st stage", "btm 2nd stage", "btm", "madiwala", "silk board", "tavarekere"}, Lat: 12.9166, Lon: 77.6101, IsDirect: true},
	{CanonicalName: "Bommanahalli", Zone: ZoneHSRKoramangala, Aliases: []string{"bommanahalli", "kudlu gate", "kudlu", "singasandra", "hongasandra"}, Lat: 12.8985, Lon: 77.6385, IsDirect: true},

	// Indiranagar & Central
	{CanonicalName: "Indiranagar", Zone: ZoneIndiranagarCentral, Aliases: []string{"indiranagar", "indira nagar", "100 ft road", "100 feet road", "cmh road", "hal 2nd stage", "hal 3rd stage", "tippasandra", "jeevanbheemanagar", "newippasandra"}, Lat: 12.9784, Lon: 77.6408, IsDirect: true},
	{CanonicalName: "Domlur", Zone: ZoneIndiranagarCentral, Aliases: []string{"domlur", "old airport road", "murugeshpalya", "kodihalli", "embassy golf links", "egl", "challaghatta"}, Lat: 12.9609, Lon: 77.6387, IsDirect: true},
	{CanonicalName: "CV Raman Nagar", Zone: ZoneIndiranagarCentral, Aliases: []string{"cv raman nagar", "c v raman nagar", "bagmane tech park", "kaggadasapura", "vignan nagar", "pai layout"}, Lat: 12.9850, Lon: 77.6639, IsDirect: true},
	{CanonicalName: "MG Road", Zone: ZoneIndiranagarCentral, Aliases: []string{"mg road", "ulsoor", "halasuru", "richmond town", "brigade road", "lavelle road", "vasanth nagar", "shivajinagar"}, Lat: 12.9756, Lon: 77.6066, IsDirect: true},
	{CanonicalName: "Frazer Town", Zone: ZoneIndiranagarCentral, Aliases: []string{"frazer town", "cox town", "benson town", "cooke town", "richards town"}, Lat: 12.9972, Lon: 77.6144, IsDirect: true},
	{CanonicalName: "Malleshwaram", Zone: ZoneIndiranagarCentral, Aliases: []string{"malleshwaram", "malleswaram", "rajajinagar", "sadashivanagar", "seshadripuram"}, Lat: 13.0031, Lon: 77.5643, IsDirect: true},

	// Whitefield & East
	{CanonicalName: "Whitefield", Zone: ZoneWhitefieldEast, Aliases: []string{"whitefield", "itpl", "hope farm", "hopefarm", "nallurhalli", "siddapura", "kadugodi", "immadihalli", "channasandra"}, Lat: 12.9698, Lon: 77.7500, IsDirect: true},
	{CanonicalName: "Brookefield", Zone: ZoneWhitefieldEast, Aliases: []string{"brookefield", "brookfield", "kundalahalli", "aecs layout", "beml layout"}, Lat: 12.9654, Lon: 77.7185, IsDirect: true},
	{CanonicalName: "Hoodi", Zone: ZoneWhitefieldEast, Aliases: []string{"hoodi", "garudacharpalya", "seetharampalya"}, Lat: 12.9922, Lon: 77.7159, IsDirect: true},
	{CanonicalName: "Varthur", Zone: ZoneWhitefieldEast, Aliases: []string{"varthur", "gunjur"}, Lat: 12.9406, Lon: 77.7469, IsDirect: false},
	{CanonicalName: "KR Puram", Zone: ZoneWhitefieldEast, Aliases: []string{"kr puram", "k r puram", "tin factory", "ramamurthy nagar", "kasturi nagar"}, Lat: 13.0040, Lon: 77.6870, IsDirect: true},

	// South Bangalore
	{CanonicalName: "Jayanagar", Zone: ZoneSouthBangalore, Aliases: []string{"jayanagar", "basavanagudi", "wilson garden", "lalbagh"}, Lat: 12.9308, Lon: 77.5838, IsDirect: true},
	{CanonicalName: "JP Nagar", Zone: ZoneSouthBangalore, Aliases: []string{"jp nagar", "j p nagar", "puttenahalli", "konanakunte", "kumaraswamy layout"}, Lat: 12.9063, Lon: 77.5857, IsDirect: true},
	{CanonicalName: "Banashankari", Zone: ZoneSouthBangalore, Aliases: []string{"banashankari", "bsk", "uttarahalli", "padmanabhanagar", "kathriguppe"}, Lat: 12.9255, Lon: 77.5468, IsDirect: true},
	{CanonicalName: "Bannerghatta Road", Zone: ZoneSouthBangalore, Aliases: []string{"bannerghatta road", "bannerghatta", "arekere", "hulimavu", "gottigere", "bilekahalli", "vega city"}, Lat: 12.8892, Lon: 77.5967, IsDirect: true},
	{CanonicalName: "Electronic City", Zone: ZoneSouthBangalore, Aliases: []string{"electronic city", "electronics city", "ecity", "neeladri nagar", "begur", "bommasandra", "hosur road"}, Lat: 12.8452, Lon: 77.6602, IsDirect: true},
	{CanonicalName: "Kanakapura Road", Zone: ZoneSouthBangalore, Aliases: []string{"kanakapura road", "talaghattapura", "vajarahalli", "doddakallasandra"}, Lat: 12.8810, Lon: 77.5460, IsDirect: true},

	// North & Hebbal
	{CanonicalName: "Hebbal", Zone: ZoneNorthHebbal, Aliases: []string{"hebbal", "manyata tech park", "manyata", "nagawara", "sahakara nagar", "rt nagar", "ganganagar"}, Lat: 13.0358, Lon: 77.5970, IsDirect: true},
	{CanonicalName: "Kalyan Nagar", Zone: ZoneNorthHebbal, Aliases: []string{"kalyan nagar", "hrbr layout", "kammanahalli", "banaswadi", "hbr layout", "horamavu"}, Lat: 13.0240, Lon: 77.6403, IsDirect: true},
	{CanonicalName: "Hennur", Zone: ZoneNorthHebbal, Aliases: []string{"hennur", "thanisandra", "bhartiya city", "rk hegde nagar", "kothanur"}, Lat: 13.0585, Lon: 77.6380, IsDirect: true},
	{CanonicalName: "Yelahanka", Zone: ZoneNorthHebbal, Aliases: []string{"yelahanka", "jakkur", "vidyaranyapura", "kogilu"}, Lat: 13.1007, Lon: 77.5963, IsDirect: true},
	{CanonicalName: "Yeshwanthpur", Zone: ZoneNorthHebbal, Aliases: []string{"yeshwanthpur", "mathikere", "ms ramaiah", "sanjaynagar", "peenya"}, Lat: 13.0285, Lon: 77.5460, IsDirect: true},
}

var (
	societyRegexes = []*regexp.Regexp{
		regexp.MustCompile(`(?i)\b((?:Prestige|Sobha|Brigade|Purva|Salarpuria|Sattva|Godrej|Adarsh|Rohan|Mantri|SNN\s+Raj|DSR|SJR|Bren|Assetz|Divyasree|Vaswani|Goyal\s+Orchid|Ajmera|Total\s+Environment|Embassy|ND|Nagarjuna)\s+[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+){0,2})\b`),
		regexp.MustCompile(`(?i)(?:in|at|located\s*in|society\s*name\s*[:=-]?|apartment\s*name\s*[:=-]?)\s+([A-Z][a-zA-Z0-9\s]{2,25}?(?:Apartments?|Heights?|Enclave|Residency|Homes?|Towers?|View|Retreat|Paradise|Greens?|Layout|Valley|Palms?|Meadows?))\b`),
		regexp.MustCompile(`(?i)(?:society|apartment|complex)\s*[:=-]\s*([A-Za-z0-9\s]{3,28})`),
	}

	landmarkRegexes = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(?:near|opposite\s*(?:to)?|opp\s*(?:to)?|behind|close\s*to|next\s*to|beside|adjacent\s*to|walking\s*distance\s*(?:from|to))\s+([A-Za-z0-9\s&'-]{3,38})`),
		regexp.MustCompile(`(?i)(?:landmark)\s*[:=-]?\s*([A-Za-z0-9\s&'-]{3,38})`),
	}

	invalidCandidateRegex = regexp.MustCompile(`(?i)^(?:rent|deposit|bhk|flat|room|male|female|broker|available|immediately|for|and|with|shared|single|double|a\s+gated|standalone|an\s+independent|good|prime)\b`)
	gatedKeywordRegex     = regexp.MustCompile(`(?i)\b(?:gated\s*society|gated\s*community|apartment\s*complex|society\s*with\s*amenities)\b`)
	poolKeywordRegex      = regexp.MustCompile(`(?i)\b(?:swimming\s*pool|pool)\b`)
	powerKeywordRegex     = regexp.MustCompile(`(?i)\b(?:power\s*backup|100%\s*power\s*backup|dg\s*backup|generator|full\s*backup)\b`)
)

// BuildSocietyMapsURL constructs a Google Maps search URL for a society and locality in Bengaluru.
func BuildSocietyMapsURL(societyName, locality string) string {
	soc := cleanPlaceToken(societyName)
	if soc == "" {
		return ""
	}
	loc := cleanPlaceToken(locality)
	query := soc + ", Bengaluru"
	if loc != "" && !strings.Contains(strings.ToLower(soc), strings.ToLower(loc)) {
		query = soc + ", " + loc + ", Bengaluru"
	}
	return "https://www.google.com/maps/search/?api=1&query=" + url.QueryEscape(query)
}

// BuildLandmarkMapsURL constructs a Google Maps search URL for a landmark and locality in Bengaluru.
func BuildLandmarkMapsURL(landmark, locality string) string {
	lm := cleanPlaceToken(landmark)
	if lm == "" {
		return ""
	}
	loc := cleanPlaceToken(locality)
	query := lm + ", Bengaluru"
	if loc != "" && !strings.Contains(strings.ToLower(lm), strings.ToLower(loc)) {
		query = lm + ", " + loc + ", Bengaluru"
	}
	return "https://www.google.com/maps/search/?api=1&query=" + url.QueryEscape(query)
}

// BuildLocalityMapsURL constructs a Google Maps search URL for a locality in Bengaluru.
func BuildLocalityMapsURL(locality string) string {
	loc := cleanPlaceToken(locality)
	if loc == "" {
		loc = "Bengaluru"
	}
	query := loc
	if !strings.Contains(strings.ToLower(loc), "bengaluru") && !strings.Contains(strings.ToLower(loc), "bangalore") {
		query = loc + ", Bengaluru"
	}
	return "https://www.google.com/maps/search/?api=1&query=" + url.QueryEscape(query)
}

func cleanPlaceToken(s string) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	if idx := strings.IndexAny(s, ".,;|•()"); idx >= 0 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}

// ExtractLandmark extracts a clean landmark phrase from raw listing text.
func ExtractLandmark(text string) string {
	for _, re := range landmarkRegexes {
		matches := re.FindAllStringSubmatch(text, -1)
		for _, m := range matches {
			if len(m) > 1 {
				cand := cleanPlaceToken(m[1])
				// Trim trailing stop fragments like "Rent 21k"
				for _, stop := range []string{" rent ", " Rent ", " deposit ", " Deposit ", " available ", " Available ", " for "} {
					if idx := strings.Index(cand, stop); idx > 0 {
						cand = strings.TrimSpace(cand[:idx])
					}
				}
				if len(cand) > 3 && !invalidCandidateRegex.MatchString(cand) {
					return cand
				}
			}
		}
	}
	return ""
}

// ResolvePlace resolves Bangalore locality, zone, gated society, landmark, coordinates, and Google Maps URLs.
func ResolvePlace(text string) PlaceResolution {
	textLower := strings.ToLower(text)
	textClean := strings.NewReplacer(" ", "", "-", "", "_", "", ".", "").Replace(textLower)

	res := PlaceResolution{
		Locality:                 "Kadubeesanahalli",
		Zone:                     ZoneBangaloreGeneral,
		IsKadubeesanahalliDirect: true,
		Lat:                      PTPAnchorLat,
		Lon:                      PTPAnchorLon,
	}

	var matchedSociety *KnownSociety
	for i := range KnownSocieties {
		s := &KnownSocieties[i]
		if strings.Contains(textClean, s.Key) || strings.Contains(textLower, strings.ToLower(s.Name)) {
			matchedSociety = s
			break
		}
	}

	var matchedLocality *LocalityInfo
	for i := range Localities {
		loc := &Localities[i]
		for _, alias := range loc.Aliases {
			if containsWordOrPhrase(textLower, alias) {
				// Avoid "PTP admin/group" false positive
				if alias == "ptp" && strings.Contains(textLower, "ptp admin") {
					continue
				}
				matchedLocality = loc
				break
			}
		}
		if matchedLocality != nil {
			break
		}
	}

	if matchedSociety != nil {
		res.SocietyName = matchedSociety.Name
		res.Locality = matchedSociety.Locality
		res.Zone = matchedSociety.Zone
		res.IsGatedSociety = matchedSociety.IsGated
		res.HasSwimmingPool = matchedSociety.HasPool
		res.HasPowerBackup = matchedSociety.HasPowerBackup
		res.IsKadubeesanahalliDirect = matchedSociety.IsKadubeesanahalliDirect
		res.Lat = matchedSociety.Lat
		res.Lon = matchedSociety.Lon
	}

	if matchedLocality != nil {
		if matchedSociety == nil {
			res.Locality = matchedLocality.CanonicalName
			res.Zone = matchedLocality.Zone
			res.Lat = matchedLocality.Lat
			res.Lon = matchedLocality.Lon
			res.IsKadubeesanahalliDirect = matchedLocality.IsDirect
		}
	} else if matchedSociety == nil {
		res.Locality = "Bengaluru"
		res.Zone = ZoneBangaloreGeneral
	}

	// Dynamic society regex extraction if not in KnownSocieties
	if res.SocietyName == "" {
		for _, re := range societyRegexes {
			m := re.FindStringSubmatch(text)
			if len(m) > 1 {
				cand := cleanPlaceToken(m[1])
				for _, stop := range []string{" near ", " Near ", " in ", " at ", " on ", " Rent ", " rent "} {
					if idx := strings.Index(cand, stop); idx > 0 {
						cand = strings.TrimSpace(cand[:idx])
					}
				}
				if len(cand) > 3 && !invalidCandidateRegex.MatchString(cand) {
					res.SocietyName = cand
					res.IsGatedSociety = true
					break
				}
			}
		}
	}

	if !res.IsGatedSociety && gatedKeywordRegex.MatchString(text) {
		res.IsGatedSociety = true
	}
	if !res.HasSwimmingPool && poolKeywordRegex.MatchString(text) {
		res.HasSwimmingPool = true
	}
	if !res.HasPowerBackup && powerKeywordRegex.MatchString(text) {
		res.HasPowerBackup = true
	}

	if strings.Contains(textLower, "panathur") && !strings.Contains(textLower, "kadubeesanahalli") && !strings.Contains(textLower, "ptp") {
		res.IsKadubeesanahalliDirect = false
	}

	res.Landmark = ExtractLandmark(text)
	res.SocietyMapsURL = BuildSocietyMapsURL(res.SocietyName, res.Locality)
	res.LandmarkMapsURL = BuildLandmarkMapsURL(res.Landmark, res.Locality)
	res.LocalityMapsURL = BuildLocalityMapsURL(res.Locality)

	return res
}

func containsWordOrPhrase(textLower, phrase string) bool {
	idx := strings.Index(textLower, phrase)
	for idx >= 0 {
		beforeOK := idx == 0 || !isAlphaNum(textLower[idx-1])
		end := idx + len(phrase)
		afterOK := end == len(textLower) || !isAlphaNum(textLower[end])
		if beforeOK && afterOK {
			return true
		}
		next := strings.Index(textLower[idx+1:], phrase)
		if next < 0 {
			break
		}
		idx = idx + 1 + next
	}
	return false
}

func isAlphaNum(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9')
}
