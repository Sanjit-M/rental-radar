# Weekday Peak Traffic Scooter Commute Engine

## Context
Static geographic distance or ideal straight-line velocity is misleading in the Bangalore Outer Ring Road tech corridor. A flat that is 1 km away on the Panathur/Balagere side can take 25 minutes to reach during evening rush hour due to the single-lane Panathur Railway Underpass (RUB) choke point, whereas a flat 1.5 km away on the Kadubeesanahalli direct side takes only 4 minutes.

## Decision
We model asymmetric two-way weekday peak congestion specifically for Monday–Friday Indian Standard Time (IST):
- **Inbound Window (11:00 AM – 1:00 PM IST)**: 1.30x baseline travel time.
- **Outbound Window (4:00 PM – 6:00 PM IST)**: 1.65x baseline travel time.
- **Panathur Underpass Bottleneck**: Automatically adds an +8 minute penalty to evening outbound commutes for listings requiring crossing the railway underpass.
- Commute score is calculated from the two-way average peak minutes rather than raw road distance.
