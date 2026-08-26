export interface SeedPost {
  fbPostId: string;
  groupName: string;
  authorName: string;
  postUrl: string;
  text: string;
  userStatus: 'new' | 'interested' | 'called' | 'applied' | 'rejected';
}

export const SEED_POSTS: SeedPost[] = [
  {
    fbPostId: 'seed_sobha_iris_001',
    groupName: 'Flat and Flatmates Bangalore',
    authorName: 'Rohan Sharma',
    postUrl: 'https://facebook.com/groups/flatandflatmatesbangalore/posts/9102831',
    text: `
      Looking for a Male Flatmate in Sobha Iris, Kadubeesanahalli (Immediate Move-in).
      Spacious master bedroom with attached washroom and dedicated road-facing balcony in a 3 BHK fully furnished apartment.
      - Society: Sobha Iris (Gated society with swimming pool, gym, clubhouse, 100% DG power backup)
      - Rent: ₹22,000 / month (Maintenance included)
      - Security Deposit: ₹45,000 (Low deposit deal)
      - No Brokerage (Direct flatmate replacement)
      - Location: Direct Kadubeesanahalli side, 3 mins scooter drive to Prestige Tech Park (PTP back gate).
      Contact: +91 98450 12345
    `,
    userStatus: 'interested',
  },
  {
    fbPostId: 'seed_cessna_1bhk_002',
    groupName: 'Bangalore Flatmates (Direct Owners)',
    authorName: 'Vikram Patel',
    postUrl: 'https://facebook.com/groups/bangaloreflatmates/posts/9102832',
    text: `
      1 BHK Available for Rent near Prestige Tech Park, Kadubeesanahalli.
      Semi-furnished 1 BHK in standalone building right behind Cessna Business Park.
      - Rent: ₹18,500
      - Deposit: ₹50,000
      - Zero brokerage / direct owner post.
      - Full 100% power backup, 2-wheeler covered parking.
      - Commute: 5 mins scooter commute to PTP main gate.
      Call/WhatsApp: 9880198765
    `,
    userStatus: 'new',
  },
  {
    fbPostId: 'seed_assetz_eastpoint_003',
    groupName: 'Flats Without Brokers Bangalore',
    authorName: 'Ankit Mehta',
    postUrl: 'https://facebook.com/groups/flatswithoutbrokerbangalore/posts/9102833',
    text: `
      Private Room in 2 BHK in Assetz East Point, Kadubeesanahalli.
      Premium gated society with Olympic size swimming pool, badminton court & 100% generator power backup.
      - Male flatmate needed.
      - Fully furnished with AC, Smart TV, washing machine. Attached private bathroom.
      - Rent: ₹26,000 / month
      - Deposit: ₹60,000
      - No Brokerage.
      - Distance: 1.2 km from Prestige Tech Park (6 mins scooter ride).
      Contact: 9742011223
    `,
    userStatus: 'called',
  },
  {
    fbPostId: 'seed_orchid_lakeview_004',
    groupName: 'Flat and Flatmates Bangalore',
    authorName: 'Karthik Reddy (Broker)',
    postUrl: 'https://facebook.com/groups/flatandflatmatesbangalore/posts/9102834',
    text: `
      Luxury 2 BHK for rent in Goyal Orchid Lakeview, Kadubeesanahalli.
      - Swimming pool, gym, 24/7 security.
      - Rent: ₹36,000 / month
      - Deposit: ₹1,50,000
      - Brokerage applicable: 15 days broker fee.
      - Fully furnished flat.
      - Contact broker: 9900123456
    `,
    userStatus: 'rejected',
  },
  {
    fbPostId: 'seed_prestige_sunnyside_005',
    groupName: 'Bangalore Flatmates',
    authorName: 'Aditya Rao',
    postUrl: 'https://facebook.com/groups/bangaloreflatmates/posts/9102835',
    text: `
      Male Flatmate required for a pre-occupied 3 BHK in Prestige Sunnyside, Kadubeesanahalli.
      - Gated community right next to PTP (Prestige Tech Park).
      - Swimming pool, clubhouse, 100% power backup.
      - Private room with attached washroom & spacious balcony.
      - Rent: ₹24,500
      - Deposit: ₹50,000
      - No Brokerage.
      - 2 mins walk / 1 min scooter to PTP!
      WhatsApp: 9845112233
    `,
    userStatus: 'applied',
  },
  {
    fbPostId: 'seed_panathur_road_006',
    groupName: 'Flats and Flatmates Kadubeesanahalli',
    authorName: 'Sumit Verma',
    postUrl: 'https://facebook.com/groups/kadubeesanahalliflats/posts/9102836',
    text: `
      1 Room in 3 BHK in Panathur Road near PTP back gate.
      - Semi-furnished flatmate vacancy for Male.
      - Rent: ₹16,000 / month
      - Deposit: ₹40,000
      - Zero brokerage.
      - Note: Located on Panathur side across railway underpass (expect 15-20 min evening traffic across underpass).
      Call: 9123456780
    `,
    userStatus: 'new',
  },
];
