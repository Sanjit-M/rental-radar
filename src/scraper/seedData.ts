import { UserListingStatus } from '../domain/types';

export interface SeedPostFixture {
  fbPostId: string;
  groupName: string;
  authorName: string;
  postedTime: string;
  postUrl: string;
  text: string;
  userStatus: UserListingStatus;
}

export const SEED_POSTS: SeedPostFixture[] = [
  {
    fbPostId: 'fb_sobha_iris_01',
    groupName: 'Flat and Flatmates Bangalore',
    authorName: 'Rohan Deshmukh',
    postedTime: '1 hr ago',
    postUrl: 'https://facebook.com/groups/flatandflatmatesbangalore/posts/10158829102',
    text: `
      Looking for a Male flatmate in Sobha Iris, Kadubeesanahalli (Directly opposite Prestige Tech Park).
      1 Master Bedroom available in a luxury 3 BHK gated community flat.
      - Rent: ₹22,000 / month (Maintenance included)
      - Security Deposit: ₹45,000 (No Brokerage, directly replacing existing flatmate).
      - Society Amenities: Full Swimming pool, gym, 100% DG power backup, clubhouse, 24/7 security.
      - Room has attached private washroom and spacious balcony.
      - Fully furnished with bed, AC, wardrobes, and modular kitchen with washing machine.
      - Commute: 2 mins walk to PTP Back Gate!
      Contact directly on WhatsApp/Call: +91 9845012345
    `,
    userStatus: 'interested',
  },
  {
    fbPostId: 'fb_assetz_east_02',
    groupName: 'Flats Without Brokers Bangalore',
    authorName: 'Karthik S.',
    postedTime: '2 hrs ago',
    postUrl: 'https://facebook.com/groups/flatswithoutbrokerbangalore/posts/201948201',
    text: `
      1 Private Room in 2 BHK in Assetz East Point, Boganahalli / Kadubeesanahalli.
      Zero Brokerage, Owner post.
      - Rent: ₹24,500 per month
      - Deposit: 2 months rent (₹49,000)
      - Gated society with swimming pool, 100% power backup, tennis court.
      - Attached bathroom, fully furnished flat.
      - Very close to PTP & Cessna Business Park.
      Looking for a working professional male.
      Call: 9880198765
    `,
    userStatus: 'new',
  },
  {
    fbPostId: 'fb_orchid_lakeview_03',
    groupName: 'Bangalore Flatmates',
    authorName: 'Abhishek Roy',
    postedTime: '3 hrs ago',
    postUrl: 'https://facebook.com/groups/bangaloreflatmates/posts/301948291',
    text: `
      Flatmate required in Goyal Orchid Lakeview, Kadubeesanahalli.
      Semi-furnished room in 3 BHK.
      - Rent: ₹25,000 / pm
      - Deposit: ₹50k
      - Gated community, swimming pool, power backup.
      - Male flatmate preferred. No broker fee.
      - Distance to PTP: 1.2 km (5 min scooter ride).
      DM or call 9741234567
    `,
    userStatus: 'called',
  },
  {
    fbPostId: 'fb_stand_alone_1bhk_04',
    groupName: 'Flats and Flatmates Kadubeesanahalli',
    authorName: 'Venkatesh Rao (Owner)',
    postedTime: '4 hrs ago',
    postUrl: 'https://facebook.com/groups/kadubeesanahalliflats/posts/401928311',
    text: `
      1 BHK standalone building flat for rent in Kadubeesanahalli near PTP.
      - Rent: ₹18,000 per month
      - Deposit: ₹40,000
      - Semi-furnished with cupboards, geyser, fan.
      - Bike parking available, power backup for lights.
      - Direct owner, no brokerage.
      - Male bachelors or working professional welcome.
      Call Owner: 9845112233
    `,
    userStatus: 'new',
  },
  {
    fbPostId: 'fb_panathur_sobhacrest_05',
    groupName: 'Bangalore Flatmates',
    authorName: 'Deepak M.',
    postedTime: '5 hrs ago',
    postUrl: 'https://facebook.com/groups/bangaloreflatmates/posts/501938211',
    text: `
      Room available in Sobha Hibiscus, Panathur Road near PTP.
      - Rent: ₹26,000 / month
      - Deposit: ₹60,000
      - Gated society, swimming pool, gym, 100% backup.
      - Attached bath, fully furnished.
      - Note: Commute involves Panathur railway underpass.
      - No brokerage. Male flatmate.
      Contact: 9811223344
    `,
    userStatus: 'new',
  },
  {
    fbPostId: 'fb_broker_high_rent_06',
    groupName: 'Flat and Flatmates Bangalore',
    authorName: 'Suresh Real Estate',
    postedTime: '6 hrs ago',
    postUrl: 'https://facebook.com/groups/flatandflatmatesbangalore/posts/601948211',
    text: `
      Luxury 2 BHK in Kadubeesanahalli near PTP.
      - Rent: ₹38,000 per month
      - Deposit: ₹1,50,000
      - Fully furnished, standalone building.
      - Brokerage applicable: 1 month rent.
      Contact broker: 9900112233
    `,
    userStatus: 'rejected',
  },
];
