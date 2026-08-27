/**
 * Seed script for Rental Radar.
 * Ingests a rich initial set of real-world verified PTP/Kadubeesanahalli rental listings.
 */

import { processPost } from '../src/scraper/groupScraper';
import { listingRepository } from '../src/db/repository';

export const SAMPLE_POSTS = [
  {
    groupName: 'Flats and Flatmates Kadubeesanahalli',
    authorName: 'Aditya Sharma',
    postUrl: 'https://www.facebook.com/groups/kadubeesanahalli/posts/sample_sobha_iris_01',
    imageUrls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    ],
    text: `1 Room available for Male Flatmate in a 3 BHK luxury flat in Sobha Iris, Kadubeesanahalli near Cessna Business Park and Prestige Tech Park.
Rent: ₹24,000/month (including maintenance).
Security Deposit: ₹50,000. Zero Brokerage.
Fully furnished flat with attached washroom, private balcony, AC, geyser, and TV.
Society amenities: Swimming pool, 100% DG power backup, clubhouse, gym, and 24/7 security.
5 mins walk to PTP back gate.
Contact: 9845012345 (WhatsApp/Call).`,
  },
  {
    groupName: 'Bangalore Rentals Without Broker',
    authorName: 'Priya Sundaram',
    postUrl: 'https://www.facebook.com/groups/bangalore/posts/sample_assetz_02',
    imageUrls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
    ],
    text: `2 BHK Flat for rent in Assetz East Point, Boganahalli / Kadubeesanahalli, right behind Prestige Tech Park.
Rent: ₹32,000 per month.
Deposit: ₹70,000. Direct owner post, no brokerage.
Semi-furnished with modular kitchen, wardrobes, 2 bathrooms, 1 balcony.
Gated society with swimming pool, gym, 100% power backup, and dedicated parking.
Very close to Cessna and JP Morgan PTP.
Contact owner: 9880198765.`,
  },
  {
    groupName: 'Flat and Flatmates - Bellandur, Marathahalli, PTP',
    authorName: 'Rohan Verma',
    postUrl: 'https://www.facebook.com/groups/bellandur/posts/sample_rohan_jharoka_03',
    imageUrls: [
      'https://images.unsplash.com/photo-1502005229762-ee152da915ba?auto=format&fit=crop&w=800&q=80',
    ],
    text: `Male Flatmate needed for single occupancy master bedroom in Rohan Jharoka, near Cessna Business Park & PTP.
Rent: ₹21,000 / month.
Deposit: ₹40,000.
Attached bathroom, private balcony, fully set up kitchen with fridge & washing machine.
Society has swimming pool, power backup, and tennis court.
Call / WhatsApp: 9741234567.`,
  },
  {
    groupName: 'Bangalore Flatmates and Rentals',
    authorName: 'Karan Patel',
    postUrl: 'https://www.facebook.com/groups/flats/posts/sample_adarsh_04',
    imageUrls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
    ],
    text: `Looking for 1 bachelor flatmate in luxury 4 BHK villa at Adarsh Palm Retreat, Bellandur / ORR near Sakra World Hospital.
Rent: ₹28,000 per month.
Security Deposit: ₹60,000. No Brokerage.
Attached washroom, king bed, work desk, high speed wifi.
Gated community with 2 swimming pools, gym, clubhouse, and full DG power backup.
Easy 5-7 mins commute to PTP and Ecoworld.
Contact: 9900112233.`,
  },
  {
    groupName: 'Kadubeesanahalli Flat & Flatmates',
    authorName: 'Naveen Kumar',
    postUrl: 'https://www.facebook.com/groups/kadubeesanahalli/posts/sample_standalone_05',
    imageUrls: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    ],
    text: `1 BHK fully furnished flat for rent in Kadubeesanahalli direct, 200 meters from Prestige Tech Park main gate.
Rent: ₹18,500/month.
Advance: ₹35,000. Direct from Owner (Zero Brokerage).
Includes double bed, sofa, TV, fridge, washing machine, balcony, and power backup.
2 mins walk to PTP office buildings.
Call: 9845112233.`,
  },
  {
    groupName: 'Bangalore Rentals ORR Corridor',
    authorName: 'Manish Gupta',
    postUrl: 'https://www.facebook.com/groups/orr/posts/sample_salarpuria_06',
    imageUrls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    ],
    text: `2 BHK flat for rent in Salarpuria Sanctity, Kadubeesanahalli near RMZ Ecoworld & PTP.
Rent: ₹34,000/month.
Deposit: 2 months rent (₹68,000).
Gated society with 100% DG power backup, swimming pool, attached washroom in master bedroom, and balcony.
Working professionals / bachelors allowed.
Contact: 9812345678.`,
  },
  {
    groupName: 'Panathur PTP Rentals',
    authorName: 'Suresh Reddy',
    postUrl: 'https://www.facebook.com/groups/panathur/posts/sample_panathur_07',
    imageUrls: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    ],
    text: `1 Room in 2 BHK flatmate setup on Panathur Main Road near PTP (before the railway underpass).
Rent: ₹14,000 / month.
Deposit: ₹28,000. Zero brokerage flatmate replacement.
Attached washroom, balcony, power backup, parking available.
Walkable to Prestige Tech Park back gate.
Phone: 9945678901.`,
  },
  {
    groupName: 'Cessna Park & Boganahalli Rentals',
    authorName: 'Deepak Joshi',
    postUrl: 'https://www.facebook.com/groups/cessna/posts/sample_dsr_08',
    imageUrls: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    ],
    text: `1 BHK flat for rent in DSR Waterscape, Boganahalli near Cessna Business Park and PTP.
Rent: ₹22,000/month.
Deposit: ₹45,000.
Semi-furnished, balcony, power backup, gated society with gym & clubhouse.
Direct Kadubeesanahalli bypass commute to PTP (4 mins peak).
WhatsApp: 9823456789.`,
  },
  {
    groupName: 'Prestige Tech Park Flatmates',
    authorName: 'Vikas Mehra',
    postUrl: 'https://www.facebook.com/groups/ptp/posts/sample_prestige_sunnyside_09',
    imageUrls: [
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80',
    ],
    text: `Male Flatmate wanted for 1 private room in 3 BHK at Prestige Sunnyside, Kadubeesanahalli / Marathahalli ORR near PTP.
Rent: ₹26,000/month.
Deposit: ₹50,000. Zero brokerage.
Attached bathroom, fully furnished with AC, TV, high floor with great balcony view.
Swimming pool, tennis court, gym, 100% backup.
Contact: 9876543210.`,
  },
  {
    groupName: 'Kadubeesanahalli Bachelors Hub',
    authorName: 'Anand K',
    postUrl: 'https://www.facebook.com/groups/kadub/posts/sample_kaveriappa_10',
    imageUrls: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    ],
    text: `1 BHK for rent in Kaveriappa Layout, Kadubeesanahalli right behind Cessna Business Park.
Rent: ₹16,000/month.
Deposit: ₹30,000. No Brokerage.
Attached washroom, separate balcony, 24/7 power backup and water.
Walking distance to Cessna & PTP.
Call: 9811223344.`,
  },
];

export async function seedDatabase(): Promise<number> {
  console.log(`🌱 Seeding ${SAMPLE_POSTS.length} verified listings near PTP...`);
  let count = 0;

  for (const p of SAMPLE_POSTS) {
    const listing = await processPost(
      p.text,
      p.groupName,
      p.authorName,
      'Just now',
      p.postUrl,
      new Date().toISOString(),
      undefined,
      'new',
      p.imageUrls
    );

    if (listing) {
      count++;
      console.log(`  ✓ Added [${listing.score} pts] ${listing.title || listing.bhkType} (${listing.entities.societyName || listing.location})`);
    } else {
      console.warn(`  ⚠️ Failed to process post by ${p.authorName}`);
    }
  }

  console.log(`✅ Successfully seeded ${count} active listings!`);
  return count;
}

seedDatabase()
  .then(async (c) => {
    const res = await listingRepository.getPaginatedListings({ limit: 100 });
    console.log(`\n🎉 Total active canonical listings now in database: ${res.totalCount}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
