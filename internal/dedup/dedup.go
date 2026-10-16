package dedup

import (
	"strings"
)

// Candidate represents the minimal fields needed for cross-group deduplication.
type Candidate struct {
	FBPostID     string
	GroupName    string
	AuthorName   string
	RawText      string
	Rent         *int
	SocietyName  string
	ContactPhone string
}

// CalculateTextSimilarity computes 3-gram Jaccard similarity in [0.0, 1.0].
func CalculateTextSimilarity(a, b string) float64 {
	if a == b {
		return 1.0
	}
	if a == "" || b == "" {
		return 0.0
	}
	setA := ngrams3(a)
	setB := ngrams3(b)
	if len(setA) == 0 || len(setB) == 0 {
		return 0.0
	}
	intersection := 0
	for k := range setA {
		if setB[k] {
			intersection++
		}
	}
	union := len(setA) + len(setB) - intersection
	if union == 0 {
		return 0.0
	}
	return float64(intersection) / float64(union)
}

func ngrams3(s string) map[string]bool {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if ch >= 'A' && ch <= 'Z' {
			ch += 'a' - 'A'
		}
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			b.WriteByte(ch)
		}
	}
	clean := b.String()
	res := make(map[string]bool)
	if len(clean) < 3 {
		if clean != "" {
			res[clean] = true
		}
		return res
	}
	for i := 0; i <= len(clean)-3; i++ {
		res[clean[i:i+3]] = true
	}
	return res
}

// AreDuplicates checks if two listings are cross-posted duplicates.
func AreDuplicates(a, b Candidate) bool {
	if a.FBPostID != "" && a.FBPostID == b.FBPostID {
		return true
	}
	if a.ContactPhone != "" && a.ContactPhone == b.ContactPhone {
		if a.Rent != nil && b.Rent != nil && *a.Rent == *b.Rent {
			return true
		}
		if a.SocietyName != "" && strings.EqualFold(a.SocietyName, b.SocietyName) {
			return true
		}
	}
	if a.AuthorName != "" &&
		!strings.EqualFold(a.AuthorName, "Facebook Member") &&
		!strings.EqualFold(a.AuthorName, "Facebook Group Member") &&
		strings.EqualFold(a.AuthorName, b.AuthorName) {
		if CalculateTextSimilarity(a.RawText, b.RawText) > 0.70 {
			return true
		}
	}
	return CalculateTextSimilarity(a.RawText, b.RawText) > 0.88
}
