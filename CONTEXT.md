# Rental Radar (PTP & Kadubeesanahalli)

An automated intelligence system to ingest, filter, parse, score, and manage rental accommodations and flatmate vacancies around Prestige Tech Park and Kadubeesanahalli, Bangalore.

## Language

### Geography & Corridors

**Prestige Tech Park (PTP)**:
The primary anchor landmark and destination on the Outer Ring Road (ORR) in Kadubeesanahalli used as the origin/destination for all distance and commute calculations.
_Avoid_: Tech park, office, destination.

**Kadubeesanahalli Direct**:
The geographic sub-corridor situated on the immediate PTP/ORR side of the railway line that reaches Prestige Tech Park without crossing the railway tracks.
_Avoid_: Near PTP, close by.

**Panathur S-Bend / Railway Underpass (RUB)**:
The single-lane bottleneck underpass connecting Kadubeesanahalli to Panathur and Balagere that introduces severe evening traffic congestion.
_Avoid_: Railway crossing, bridge, tunnel.

### Accommodation & Terms

**Rental Listing**:
A structured, parsed, and scored accommodation offering or flatmate vacancy within the target geography.
_Avoid_: Ad, post, classified, property.

**Zero Brokerage**:
A listing posted directly by the property owner or an existing flatmate seeking a replacement, requiring zero intermediary commission.
_Avoid_: Direct post, owner ad, no agent.

**Broker Fee**:
Any listing requiring a fee or commission (e.g. 15 days or 1 month rent) paid to an intermediary broker.
_Avoid_: Brokerage applicable, commission.

**Gated Society**:
A managed residential community with physical boundary walls, security, dedicated power backup, and shared amenities (e.g., Sobha Iris, Assetz East Point).
_Avoid_: Standalone building, apartment, house.

### Scoring & Commute

**Peak Scooter Commute**:
The simulated two-wheeler travel duration during Monday–Friday Bangalore tech corridor peak windows (11:00 AM – 1:00 PM IST inbound, 4:00 PM – 6:00 PM IST outbound).
_Avoid_: Travel time, drive time, distance in minutes.

**Rating Score**:
A deterministic 0–100 integer evaluating rental price, deposit ratio, brokerage status, society infrastructure, and peak commute efficiency against user preferences.
_Avoid_: Match percentage, rank, grade.

**Unicorn Deal**:
A top-tier listing achieving a rating score $\ge 90$, characterized by rent $\le$ ₹25,000, zero brokerage, gated society with swimming pool, and $<7$ min peak commute.
_Avoid_: Best deal, hot flat.
