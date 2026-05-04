import { getInactiveCust } from './src/actions/customers.js';

async function main() {
  const data = await getInactiveCust();
  console.log(data.map(d => d.inactiveat));
}

main();
