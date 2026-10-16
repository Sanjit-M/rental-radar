package scorer

import (
	"math"

	"github.com/Sanjit-M/rental-radar/internal/extractor"
	"github.com/Sanjit-M/rental-radar/internal/gazetteer"
)

// CommuteWindow holds weekday peak scooter commute simulation metrics.
type CommuteWindow struct {
	DistanceKm                     float64 `json:"distanceKm"`
	InboundMins                    int     `json:"inboundMins"`
	OutboundMins                   int     `json:"outboundMins"`
	TwoWayAvgPeakMins              int     `json:"twoWayAvgPeakMins"`
	HasPanathurUnderpassBottleneck bool    `json:"hasPanathurUnderpassBottleneck"`
}

// ScoringBreakdown holds the exact 14-field breakdown stored in SQLite/Turso JSON.
type ScoringBreakdown struct {
	Base              int `json:"base"`
	Rent              int `json:"rent"`
	Brokerage         int `json:"brokerage"`
	Deposit           int `json:"deposit"`
	GatedSociety      int `json:"gatedSociety"`
	SwimmingPool      int `json:"swimmingPool"`
	PowerBackup       int `json:"powerBackup"`
	AttachedWashroom  int `json:"attachedWashroom"`
	VegetarianPenalty int `json:"vegetarianPenalty"`
	BachelorMatch     int `json:"bachelorMatch"`
	WalkProximity     int `json:"walkProximity"`
	Furnished         int `json:"furnished"`
	PanathurBypass    int `json:"panathurBypass"`
	Commute           int `json:"commute"`
}

// ScoredListingResult holds the computed 0-100 score, breakdown, tier, and commute window.
type ScoredListingResult struct {
	Score     int              `json:"score"`
	Breakdown ScoringBreakdown `json:"breakdown"`
	Tier      string           `json:"tier"`
	Commute   CommuteWindow    `json:"commute"`
}

// HaversineDistanceKm computes great-circle distance in kilometers.
func HaversineDistanceKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// CalculateCommute simulates weekday peak commute to Prestige Tech Park (PTP) anchor.
func CalculateCommute(lat, lon float64, isDirect bool) CommuteWindow {
	if lat == 0 || lon == 0 {
		lat = gazetteer.PTPAnchorLat
		lon = gazetteer.PTPAnchorLon
	}
	straight := HaversineDistanceKm(lat, lon, gazetteer.PTPAnchorLat, gazetteer.PTPAnchorLon)
	roadDist := math.Max(0.5, math.Round(straight*1.35*10)/10)

	baselineMins := math.Max(2.0, (roadDist/22.0)*60.0)
	inboundMins := int(math.Max(2, math.Round(baselineMins*1.30)))
	outboundMins := int(math.Max(2, math.Round(baselineMins*1.65)))

	bottleneck := !isDirect
	if bottleneck {
		outboundMins += 8
	}

	avg := int(math.Round(float64(inboundMins+outboundMins) / 2.0))
	return CommuteWindow{
		DistanceKm:                     roadDist,
		InboundMins:                    inboundMins,
		OutboundMins:                   outboundMins,
		TwoWayAvgPeakMins:              avg,
		HasPanathurUnderpassBottleneck: bottleneck,
	}
}

// ScoreListing computes the deterministic 0-100 score, 14-field breakdown, and tier.
func ScoreListing(ent extractor.ExtractedEntities) ScoredListingResult {
	commute := CalculateCommute(ent.SocietyLat, ent.SocietyLon, ent.IsKadubeesanahalliDirect)

	bd := ScoringBreakdown{
		Base: 50,
	}

	// 1. Rent
	if ent.Rent != nil {
		r := *ent.Rent
		if r <= 25000 {
			bd.Rent = 20
		} else if r <= 30000 {
			bd.Rent = 0
		} else {
			bd.Rent = -30
		}
	}

	// 2. Brokerage
	if ent.IsBrokerage {
		bd.Brokerage = -40
	} else {
		bd.Brokerage = 15
	}

	// 3. Deposit
	if ent.Deposit != nil {
		d := *ent.Deposit
		if (ent.Rent != nil && float64(d) > 2.2*float64(*ent.Rent)) || d > 60000 {
			bd.Deposit = -30
		} else if d <= 50000 {
			bd.Deposit = 10
		}
	}

	// 4. Gated Society & Amenities
	if ent.IsGatedSociety {
		bd.GatedSociety = 15
	}
	if ent.HasSwimmingPool {
		bd.SwimmingPool = 15
	}
	if ent.HasPowerBackup {
		bd.PowerBackup = 10
	} else {
		bd.PowerBackup = -20
	}

	// 5. Attached Washroom
	if ent.HasAttachedWashroom {
		bd.AttachedWashroom = 10
	} else {
		bd.AttachedWashroom = -15
	}

	// 6. Vegetarian Penalty
	if ent.IsVegetarianOnly {
		bd.VegetarianPenalty = -50
	}

	// 7. Bachelor / Male Match
	if ent.IsFemaleOnly {
		bd.BachelorMatch = -30
	} else if ent.IsMaleBachelorAllowed {
		bd.BachelorMatch = 10
	}

	// 8. Walk Proximity
	if ent.IsWalkingDistance || commute.DistanceKm <= 0.6 {
		bd.WalkProximity = 15
	}

	// 9. Furnishing
	if ent.Furnishing == "Fully Furnished" || ent.Furnishing == "Semi-Furnished" {
		bd.Furnished = 5
	}

	// 10. Panathur Bypass
	if ent.IsKadubeesanahalliDirect {
		bd.PanathurBypass = 10
	} else if commute.HasPanathurUnderpassBottleneck {
		bd.PanathurBypass = -35
	}

	// 11. Commute
	if commute.TwoWayAvgPeakMins <= 7 {
		bd.Commute = 20
	} else if commute.TwoWayAvgPeakMins <= 12 {
		bd.Commute = 10
	} else if commute.TwoWayAvgPeakMins <= 18 {
		bd.Commute = -10
	} else {
		bd.Commute = -30
	}

	rawTotal := bd.Base +
		bd.Rent +
		bd.Brokerage +
		bd.Deposit +
		bd.GatedSociety +
		bd.SwimmingPool +
		bd.PowerBackup +
		bd.AttachedWashroom +
		bd.VegetarianPenalty +
		bd.BachelorMatch +
		bd.WalkProximity +
		bd.Furnished +
		bd.PanathurBypass +
		bd.Commute

	score := rawTotal
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	tier := "⚠️ Low Match"
	if score >= 90 {
		tier = "🔥 Unicorn Deal"
	} else if score >= 70 {
		tier = "✨ Great Match"
	} else if score >= 45 {
		tier = "⚡ Moderate Match"
	}

	return ScoredListingResult{
		Score:     score,
		Breakdown: bd,
		Tier:      tier,
		Commute:   commute,
	}
}
