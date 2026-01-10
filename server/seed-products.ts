import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating ASOF products and prices...');

  const existingProducts = await stripe.products.search({ query: "name:'ASOF Lite'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed.');
    return;
  }

  const liteProduct = await stripe.products.create({
    name: 'ASOF Lite',
    description: 'Single checks & daily validation. Includes verdict and confidence score.',
    metadata: {
      tier: 'lite',
      features: 'verdict,score'
    }
  });
  
  const litePrice = await stripe.prices.create({
    product: liteProduct.id,
    unit_amount: 50,
    currency: 'usd',
  });
  console.log(`Created ASOF Lite: ${liteProduct.id}, Price: ${litePrice.id}`);

  const proProduct = await stripe.products.create({
    name: 'ASOF Pro',
    description: 'High-risk decisions with evidence. Includes verdict, score, evidence, and risk analysis.',
    metadata: {
      tier: 'pro',
      features: 'verdict,score,evidence,risk'
    }
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 100,
    currency: 'usd',
  });
  console.log(`Created ASOF Pro: ${proProduct.id}, Price: ${proPrice.id}`);

  const maxProduct = await stripe.products.create({
    name: 'ASOF Max',
    description: 'Mission-critical multi-signal verification. Includes all features plus conflict detection and priority execution.',
    metadata: {
      tier: 'max',
      features: 'verdict,score,evidence,risk,conflict,priority'
    }
  });

  const maxPrice = await stripe.prices.create({
    product: maxProduct.id,
    unit_amount: 250,
    currency: 'usd',
  });
  console.log(`Created ASOF Max: ${maxProduct.id}, Price: ${maxPrice.id}`);

  console.log('Done! Products created successfully.');
  console.log('\nPrice IDs for reference:');
  console.log(`  LITE: ${litePrice.id}`);
  console.log(`  PRO: ${proPrice.id}`);
  console.log(`  MAX: ${maxPrice.id}`);
}

seedProducts().catch(console.error);
