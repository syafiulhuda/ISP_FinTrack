import { getNotifications } from '../src/actions/db.js';

async function test() {
  const notifs = await getNotifications();
  console.log('Count:', notifs.length);
  console.log('Unread:', notifs.filter(n => n.is_unread).length);
  if (notifs.length > 0) {
    console.log('First one:', notifs[0]);
  }
}

test();
