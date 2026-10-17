package extractor

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Sanjit-M/rental-radar/internal/gazetteer"
)

// ExtractedEntities holds all parsed attributes of a rental listing.
type ExtractedEntities struct {
	Rent                     *int     `json:"rent"`
	Deposit                  *int     `json:"deposit"`
	BHKType                  string   `json:"bhkType"`
	IsBrokerage              bool     `json:"isBrokerage"`
	IsGatedSociety           bool     `json:"isGatedSociety"`
	SocietyName              string   `json:"societyName,omitempty"`
	Landmark                 string   `json:"landmark,omitempty"`
	Location                 string   `json:"location"`
	Zone                     string   `json:"zone"`
	SocietyMapsURL           string   `json:"societyMapsUrl,omitempty"`
	LandmarkMapsURL          string   `json:"landmarkMapsUrl,omitempty"`
	LocalityMapsURL          string   `json:"localityMapsUrl"`
	HasSwimmingPool          bool     `json:"hasSwimmingPool"`
	HasPowerBackup           bool     `json:"hasPowerBackup"`
	HasAttachedWashroom      bool     `json:"hasAttachedWashroom"`
	HasBalcony               bool     `json:"hasBalcony"`
	IsVegetarianOnly         bool     `json:"isVegetarianOnly"`
	IsMaleBachelorAllowed    bool     `json:"isMaleBachelorAllowed"`
	IsFemaleOnly             bool     `json:"isFemaleOnly"`
	IsWalkingDistance        bool     `json:"isWalkingDistance"`
	Furnishing               string   `json:"furnishing"`
	IsKadubeesanahalliDirect bool     `json:"isKadubeesanahalliDirect"`
	ContactPhone             string   `json:"contactPhone,omitempty"`
	SocietyLat               float64  `json:"societyLat"`
	SocietyLon               float64  `json:"societyLon"`
	ImageURLs                []string `json:"imageUrls,omitempty"`
	IsRentalOffering         bool     `json:"isRentalOffering"`
}

var (
	ignoreLinePatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)^like\b`),
		regexp.MustCompile(`(?i)^reply\b`),
		regexp.MustCompile(`(?i)^share\b`),
		regexp.MustCompile(`(?i)^comment\b`),
		regexp.MustCompile(`(?i)^view more comments`),
		regexp.MustCompile(`(?i)^write a comment`),
		regexp.MustCompile(`(?i)^all reactions`),
		regexp.MustCompile(`(?i)^\d+\s*(?:h|hr|hrs|d|days?|w|mins?)$`),
		regexp.MustCompile(`(?i)^top fan\b`),
		regexp.MustCompile(`(?i)^group member\b`),
		regexp.MustCompile(`(?i)^see more\b`),
		regexp.MustCompile(`(?i)^see translation\b`),
	}

	rentPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)\b(\d{1,2}(?:\.\d+)?)\s*k\s*(?:/|\s*per\s*)?(?:month|pm)\b`),
		regexp.MustCompile(`(?i)(?:rent(?:\s*(?:including|incl\.?|with)\s*maintenance)?|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:\.\d+)?)\s*k\b`),
		regexp.MustCompile(`(?i)(?:rent(?:\s*(?:including|incl\.?|with)\s*maintenance)?|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}[,\d]{3,5})\b`),
		regexp.MustCompile(`(?i)(?:₹|rs\.?|inr)\s*(\d{1,2}(?:\.\d+)?)\s*k\b`),
		regexp.MustCompile(`(?i)(?:₹|rs\.?|inr)\s*(\d{1,2}[,\d]{3,5})\b`),
		regexp.MustCompile(`(?i)\b(\d{1,2}[,\d]{3,5})\s*(?:/|\s*per\s*)?(?:month|pm)\b`),
		regexp.MustCompile(`(?i)\b(\d{1,2}(?:\.\d+)?)\s*k\b`),
	}

	depositMonthsRe = regexp.MustCompile(`(?i)(?:deposit|advance|security)\s*[:=-]?\s*(\d{1,2})\s*(?:months?|months?\s*rent)\b`)
	depositPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(?:deposit|advance|security\s*deposit)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:\.\d+)?)\s*k\b`),
		regexp.MustCompile(`(?i)(?:deposit|advance|security\s*deposit)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}[,\d]{3,6})\b`),
	}

	noBrokerageRe = regexp.MustCompile(`(?i)\b(?:no\s*brokerage|zero\s*brokerage|without\s*brokerage|0\s*brokerage|direct\s*(?:from\s*)?owner|owner\s*post|flatmate\s*replacement|no\s*broker)\b`)
	brokerageRe   = regexp.MustCompile(`(?i)\b(?:brokerage\s*applicable|brokerage\s*charges|brokerage\s*:\s*\w+|broker\s*fee|broker\s*contact|contact\s*broker|15\s*days\s*brokerage|1\s*month\s*brokerage|half\s*month\s*brokerage)\b`)

	washroomRe   = regexp.MustCompile(`(?i)\b(?:attached\s*(?:washroom|bathroom|bath|toilet|restroom)|private\s*(?:washroom|bathroom|bath|toilet)|personal\s*(?:washroom|bathroom|bath)|with\s*attached\s*bath|dedicated\s*(?:washroom|bathroom|bath))\b`)
	balconyRe    = regexp.MustCompile(`(?i)\bbalcon(?:y|ies)\b`)
	vegOnlyRe    = regexp.MustCompile(`(?i)\b(?:veg\s*only|vegetarian\s*only|strictly\s*veg|strictly\s*vegetarian|no\s*non[\s-]?veg|vegetarian\s*flatmate)\b`)
	femaleOnlyRe = regexp.MustCompile(`(?i)\b(?:females?\s*only|girls?\s*only|looking\s*for\s*(?:a\s*)?(?:female|girl|woman)|only\s*for\s*(?:female|girls?|women)|for\s*female\s*only|women\s*only|female\s*flatmate|female\s*replacement)\b`)
	maleAllowRe  = regexp.MustCompile(`(?i)\b(?:male\s*(?:flatmate|bachelor|bachelors|professional|replacement)?|guys?\s*only|for\s*male|for\s*bachelors|looking\s*for\s*(?:a\s*)?male|any\s*gender|co-ed|boys?\s*(?:and|or|/)\s*girls?)\b`)
	walkDistRe   = regexp.MustCompile(`(?i)\b(?:walking\s*distance|walk\s*to\s*ptp|[1-5]\s*mins?\s*walk|opposite\s*(?:to\s*)?ptp|opposite\s*prestige\s*tech\s*park|walkable)\b`)

	fullFurnishedRe = regexp.MustCompile(`(?i)\b(?:fully\s*furnished|full\s*furnished|well\s*furnished)\b`)
	semiFurnishedRe = regexp.MustCompile(`(?i)\b(?:semi\s*furnished|semi-furnished)\b`)
	unfurnishedRe   = regexp.MustCompile(`(?i)\b(?:unfurnished|raw\s*flat|un-furnished)\b`)

	phoneRe    = regexp.MustCompile(`(?:\+91[\-\s]?)?([6-9]\d{4}[\-\s]?\d{5})\b`)
	imageURLRe = regexp.MustCompile(`(?i)(https?://[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?)`)

	bhk3Re     = regexp.MustCompile(`(?i)\b(?:3\s*bhk|3\s*bedroom|master\s*bedroom|in\s*(?:a\s*)?3\s*bhk|4\s*bhk)\b`)
	bhk2Re     = regexp.MustCompile(`(?i)\b(?:2\s*bhk|2\s*bedroom|in\s*(?:a\s*)?2\s*bhk)\b`)
	bhk1Re     = regexp.MustCompile(`(?i)\b(?:1\s*bhk|1\s*rk|studio|single\s*room|private\s*room|1\s*bedroom|independent\s+flat|independent\s+house)\b`)
	flatmateRe = regexp.MustCompile(`(?i)\b(?:flatmate|roommate|occupancy|pre-occupied|preoccupied|room\s+available|room\s+for\s+rent|furnished\s+room|spacious\s+room|independent\s+room|single\s+occupancy|sharing\s+room|replacement)\b`)

	authorRe = regexp.MustCompile(`(?i)(?:contact|reach out to|call|whatsapp|ping|posted by|dm|owner|author|name is|myself|this is)\s*[:–-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)`)
)

// CleanPostText strips Facebook UI controls and reaction noise lines.
func CleanPostText(text string) string {
	lines := strings.Split(text, "\n")
	var cleaned []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		skip := false
		for _, re := range ignoreLinePatterns {
			if re.MatchString(trimmed) {
				skip = true
				break
			}
		}
		if !skip {
			cleaned = append(cleaned, trimmed)
		}
	}
	return strings.Join(cleaned, "\n")
}

// GeneratePostID computes a deterministic `fb_<base36>` post identifier matching TypeScript.
func GeneratePostID(groupName, authorName, text string) string {
	noSpace := strings.Join(strings.Fields(text), "")
	if len(noSpace) > 150 {
		noSpace = noSpace[:150]
	}
	combined := fmt.Sprintf("%s:%s:%s", groupName, authorName, noSpace)
	var hash int32
	for i := 0; i < len(combined); i++ {
		hash = (hash << 5) - hash + int32(combined[i])
	}
	absHash := int64(hash)
	if absHash < 0 {
		absHash = -absHash
	}
	return "fb_" + strconv.FormatInt(absHash, 36)
}

// ExtractRent extracts monthly rent in INR.
func ExtractRent(text string) *int {
	for _, re := range rentPatterns {
		m := re.FindStringSubmatch(text)
		if len(m) > 1 {
			valStr := strings.ReplaceAll(m[1], ",", "")
			num, err := strconv.ParseFloat(valStr, 64)
			if err != nil {
				continue
			}
			var val float64
			if strings.Contains(valStr, ".") || num < 100 {
				val = num * 1000
			} else {
				val = num
			}
			rounded := int(math.Round(val))
			if rounded >= 5000 && rounded <= 100000 {
				return &rounded
			}
		}
	}
	return nil
}

// ExtractDeposit extracts security deposit in INR.
func ExtractDeposit(text string, rent *int) *int {
	if m := depositMonthsRe.FindStringSubmatch(text); len(m) > 1 && rent != nil {
		if months, err := strconv.Atoi(m[1]); err == nil && months > 0 && months <= 12 {
			val := months * (*rent)
			return &val
		}
	}
	for _, re := range depositPatterns {
		m := re.FindStringSubmatch(text)
		if len(m) > 1 {
			valStr := strings.ReplaceAll(m[1], ",", "")
			num, err := strconv.ParseFloat(valStr, 64)
			if err != nil {
				continue
			}
			var val float64
			if num < 1000 {
				val = num * 1000
			} else {
				val = num
			}
			rounded := int(math.Round(val))
			if rounded >= 10000 && rounded <= 500000 {
				return &rounded
			}
		}
	}
	return nil
}

// ExtractBrokerage detects whether a broker fee applies.
func ExtractBrokerage(text string) bool {
	if noBrokerageRe.MatchString(text) {
		return false
	}
	return brokerageRe.MatchString(text)
}

// ExtractBHKType classifies the accommodation into one of the 4 canonical BHK types.
func ExtractBHKType(text string) (string, bool) {
	if bhk3Re.MatchString(text) {
		return "3 BHK (Shared/Full)", true
	}
	if bhk2Re.MatchString(text) {
		return "2 BHK (Shared/Full)", true
	}
	if bhk1Re.MatchString(text) {
		return "1 BHK", true
	}
	if flatmateRe.MatchString(text) {
		return "Private Room / Flatmate", true
	}
	return "2 BHK (Shared/Full)", false
}

// ExtractFurnishing classifies furnishing status.
func ExtractFurnishing(text string) string {
	if fullFurnishedRe.MatchString(text) {
		return "Fully Furnished"
	}
	if semiFurnishedRe.MatchString(text) {
		return "Semi-Furnished"
	}
	if unfurnishedRe.MatchString(text) {
		return "Unfurnished"
	}
	return "Unknown"
}

// ExtractPhone extracts a 10-digit Indian mobile number.
func ExtractPhone(text string) string {
	m := phoneRe.FindStringSubmatch(text)
	if len(m) > 1 {
		var digits strings.Builder
		for _, r := range m[1] {
			if r >= '0' && r <= '9' {
				digits.WriteRune(r)
			}
		}
		s := digits.String()
		if len(s) == 10 {
			return s
		}
	}
	return ""
}

// ExtractGenderPreference returns (isMaleBachelorAllowed, isFemaleOnly).
func ExtractGenderPreference(text string) (bool, bool) {
	femaleOnly := femaleOnlyRe.MatchString(text)
	maleExplicit := maleAllowRe.MatchString(text)
	if maleExplicit && strings.Contains(strings.ToLower(text), "any gender") {
		femaleOnly = false
	}
	maleAllowed := maleExplicit || (!femaleOnly && !strings.Contains(strings.ToLower(text), "family only"))
	return maleAllowed, femaleOnly
}

// IsRentalOffering returns true if the text is a valid Bangalore rental post (not overseas spam, property sale, or pure seeker).
func IsRentalOffering(text string) bool {
	lower := strings.ToLower(text)
	spamWords := []string{
		"selling my bike", "selling car", "laptop for sale", "job opening", "we are hiring",
		"interiors design", "dubai", "sharjah", "bur dubai", "al barsha",
		"apartment for sale", "flat for sale", "house for sale", "villa for sale",
		"crore", "appliance repair", "upcoming landmark", "submit your first comment",
	}
	for _, w := range spamWords {
		if strings.Contains(lower, w) {
			return false
		}
	}
	trimmed := strings.TrimSpace(lower)
	pureSeeker := strings.HasPrefix(trimmed, "looking for a 1bhk") ||
		strings.HasPrefix(trimmed, "looking for a 2bhk") ||
		strings.HasPrefix(trimmed, "looking for a 3bhk") ||
		strings.HasPrefix(trimmed, "looking for a flat") ||
		strings.HasPrefix(trimmed, "i need a flat") ||
		strings.HasPrefix(trimmed, "need 1bhk") ||
		strings.HasPrefix(trimmed, "need 2bhk") ||
		strings.HasPrefix(trimmed, "need 3bhk") ||
		strings.Contains(lower, "\nneed 2bhk") ||
		strings.Contains(lower, "\nneed 1bhk") ||
		strings.HasPrefix(trimmed, "searching for flat")
	if pureSeeker && !flatmateRe.MatchString(lower) {
		return false
	}
	return true
}

// ExtractEntities runs the full entity extraction and Bangalore gazetteer pipeline on a raw post.
func ExtractEntities(rawText string, externalImages []string) ExtractedEntities {
	clean := CleanPostText(rawText)
	rent := ExtractRent(clean)
	deposit := ExtractDeposit(clean, rent)
	bhkType, hasBHK := ExtractBHKType(clean)
	place := gazetteer.ResolvePlace(clean)
	maleAllowed, femaleOnly := ExtractGenderPreference(clean)

	images := externalImages
	if len(images) == 0 {
		matches := imageURLRe.FindAllString(clean, 10)
		seen := map[string]bool{}
		for _, u := range matches {
			if !seen[u] {
				seen[u] = true
				images = append(images, u)
			}
		}
	}

	isOffering := IsRentalOffering(clean) && (hasBHK || rent != nil || place.SocietyName != "")

	return ExtractedEntities{
		Rent:                     rent,
		Deposit:                  deposit,
		BHKType:                  bhkType,
		IsBrokerage:              ExtractBrokerage(clean),
		IsGatedSociety:           place.IsGatedSociety,
		SocietyName:              place.SocietyName,
		Landmark:                 place.Landmark,
		Location:                 place.Locality,
		Zone:                     place.Zone,
		SocietyMapsURL:           place.SocietyMapsURL,
		LandmarkMapsURL:          place.LandmarkMapsURL,
		LocalityMapsURL:          place.LocalityMapsURL,
		HasSwimmingPool:          place.HasSwimmingPool,
		HasPowerBackup:           place.HasPowerBackup,
		HasAttachedWashroom:      washroomRe.MatchString(clean),
		HasBalcony:               balconyRe.MatchString(clean),
		IsVegetarianOnly:         vegOnlyRe.MatchString(clean),
		IsMaleBachelorAllowed:    maleAllowed,
		IsFemaleOnly:             femaleOnly,
		IsWalkingDistance:        walkDistRe.MatchString(clean),
		Furnishing:               ExtractFurnishing(clean),
		IsKadubeesanahalliDirect: place.IsKadubeesanahalliDirect,
		ContactPhone:             ExtractPhone(clean),
		SocietyLat:               place.Lat,
		SocietyLon:               place.Lon,
		ImageURLs:                images,
		IsRentalOffering:         isOffering,
	}
}

// ExtractAuthorFromText extracts poster name from contact signature lines if DOM author is absent.
func ExtractAuthorFromText(rawText string) string {
	stopWords := map[string]bool{
		"on": true, "at": true, "for": true, "or": true, "and": true, "if": true, "via": true,
		"to": true, "in": true, "is": true, "me": true, "us": true, "the": true, "flat": true,
		"rent": true, "male": true, "female": true, "room": true, "bhk": true, "broker": true,
		"deposit": true, "price": true, "prestige": true, "sobha": true, "details": true,
		"visit": true, "photos": true, "pics": true, "info": true, "call": true, "dm": true,
		"whatsapp": true, "phone": true, "mobile": true, "number": true, "name": true,
		"contact": true, "brokerage": true, "without": true, "with": true, "any": true, "no": true,
	}
	m := authorRe.FindStringSubmatch(rawText)
	if len(m) > 1 {
		words := strings.Fields(m[1])
		for len(words) > 0 && stopWords[strings.ToLower(words[len(words)-1])] {
			words = words[:len(words)-1]
		}
		if len(words) > 0 && !stopWords[strings.ToLower(words[0])] {
			cand := strings.Join(words, " ")
			if len(cand) > 1 {
				return cand
			}
		}
	}
	return "Facebook Group Member"
}

// ParseFacebookTimestamp parses relative ("2h", "25m", "Yesterday") or calendar timestamps into IST.
func ParseFacebookTimestamp(rawText string, ref time.Time) (time.Time, string, bool) {
	clean := strings.TrimSpace(rawText)
	if clean == "" {
		return ref, FormatIST(ref), false
	}
	lower := strings.ToLower(clean)

	if strings.Contains(lower, "just now") {
		return ref, FormatIST(ref), true
	}
	if strings.Contains(lower, "yesterday") {
		t := ref.Add(-24 * time.Hour)
		return t, FormatIST(t), true
	}

	minRe := regexp.MustCompile(`\b(\d+)\s*(?:m|min|mins|minutes?)(?:\s*ago)?\b`)
	if m := minRe.FindStringSubmatch(lower); len(m) > 1 {
		if mins, err := strconv.Atoi(m[1]); err == nil {
			t := ref.Add(-time.Duration(mins) * time.Minute)
			return t, FormatIST(t), true
		}
	}

	hrRe := regexp.MustCompile(`\b(\d+)\s*(?:h|hr|hrs|hours?)(?:\s*ago)?\b`)
	if m := hrRe.FindStringSubmatch(lower); len(m) > 1 {
		if hrs, err := strconv.Atoi(m[1]); err == nil {
			t := ref.Add(-time.Duration(hrs) * time.Hour)
			return t, FormatIST(t), true
		}
	}

	dayRe := regexp.MustCompile(`\b(\d+)\s*(?:d|day|days?)(?:\s*ago)?\b`)
	if m := dayRe.FindStringSubmatch(lower); len(m) > 1 {
		if days, err := strconv.Atoi(m[1]); err == nil {
			t := ref.Add(-time.Duration(days) * 24 * time.Hour)
			return t, FormatIST(t), true
		}
	}

	return ref, clean, false
}

// FormatIST formats a time in Indian Standard Time.
func FormatIST(t time.Time) string {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.FixedZone("IST", 5*3600+1800)
	}
	return t.In(loc).Format("02 Jan 2006, 03:04 PM") + " IST"
}
