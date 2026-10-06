import { processPost } from './groupScraper';
import { RentalListing } from '../domain/types';

/** Verified seed property records covering core Bangalore tech corridor localities. */
export const SEED_LISTINGS_DATA = [
  {
    rawText:
      'Spacious 1 room with private attached washroom in a fully furnished 3BHK flat at Sobha Iris, Kadubeesanahalli right next to Prestige Tech Park back gate. Rent is ₹24,000, deposit ₹48,000. Gated society with swimming pool, gym, 100% power backup. Male flatmate preferred. Contact: 9845012345.',
    groupName: 'Flat and Flatmates Kadubeesanahalli / PTP',
    authorName: 'Aditya Sharma',
    postUrl: 'https://www.facebook.com/groups/posts/seed_sobha_iris_1',
    imageUrls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop',
    ],
  },
  {
    rawText:
      'Single occupancy room in 2BHK flat available in Suncity Apartments, Outer Ring Road Kadubeesanahalli. 5 mins walk to PTP and Cessna Business Park. Rent ₹22,000, zero brokerage direct owner. 100% power backup, gated society, covered parking. Deposit ₹45,000. Phone: 9900112233.',
    groupName: 'Flats Without Brokers Bangalore',
    authorName: 'Vikram Mehta',
    postUrl: 'https://www.facebook.com/groups/posts/seed_suncity_2',
    imageUrls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop',
    ],
  },
  {
    rawText:
      'Looking for a flatmate in Vaswani Reserve, Boganahalli near Prestige Tech Park. Master bedroom with attached washroom and balcony. Rent ₹26,000, deposit ₹55,000. Society has Olympic swimming pool, clubhouse, 24/7 power backup. No broker involved. Call or WhatsApp 9811223344.',
    groupName: 'Flat and Flatmates Bellandur, Kadubeesanahalli',
    authorName: 'Rohan Gupta',
    postUrl: 'https://www.facebook.com/groups/posts/seed_vaswani_3',
    imageUrls: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop',
    ],
  },
  {
    rawText:
      'Private room available in 3BHK flat at Green Glen Layout, Bellandur. Direct access to Kadubeesanahalli without Panathur underpass bottleneck. Rent ₹21,000, deposit ₹42,000. Fully furnished with washing machine, fridge, Wi-Fi. Contact: 9731234567.',
    groupName: 'Bangalore Flat Seekers & Offers',
    authorName: 'Siddharth Nair',
    postUrl: 'https://www.facebook.com/groups/posts/seed_greenglen_4',
    imageUrls: [
      'https://images.unsplash.com/photo-1502005229762-ee1b402e3b2b?w=800&auto=format&fit=crop',
    ],
  },
  {
    rawText:
      '1 BHK fully furnished independent flat in Kariyammana Agrahara near Prestige Tech Park. Rent ₹19,000, deposit ₹38,000. Direct owner, no brokerage. Power backup and 2-wheeler parking. Bachelor friendly. Contact: 9988776655.',
    groupName: 'Flats Without Broker Bangalore',
    authorName: 'Karthik Raja',
    postUrl: 'https://www.facebook.com/groups/posts/seed_kariya_5',
    imageUrls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop',
    ],
  },
  {
    rawText:
      'Master bedroom with attached washroom in 2BHK flat near Marathahalli Multiplex, just 10 mins scooter ride to Prestige Tech Park. Rent ₹18,000, deposit ₹35,000. Gated apartment, semi-furnished, no broker fee. Contact: 9876543210.',
    groupName: 'Flat and Flatmates Bangalore',
    authorName: 'Nitin Patel',
    postUrl: 'https://www.facebook.com/groups/posts/seed_marathahalli_6',
    imageUrls: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop',
    ],
  },
];

/**
 * Ingests curated high-density seed listings into the local / Turso database.
 *
 * @returns Array of successfully processed canonical RentalListing records.
 */
export async function ingestSeedListings(): Promise<RentalListing[]> {
  const results: RentalListing[] = [];

  for (const seed of SEED_LISTINGS_DATA) {
    let retries = 3;
    while (retries > 0) {
      try {
        const listing = await processPost(
          seed.rawText,
          seed.groupName,
          seed.authorName,
          'Recently',
          seed.postUrl,
          undefined,
          undefined,
          'new',
          seed.imageUrls,
          true
        );
        if (listing) {
          results.push(listing);
        }
        break;
      } catch (err: any) {
        retries--;
        if (retries === 0) {
          console.warn('Failed to ingest seed listing:', err?.message || err);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }
  }

  return results;
}
