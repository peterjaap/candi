// Prints all signups as CSV. Run: npm run --silent export-signups > signups.csv
import { get, list } from '@vercel/blob';

const signups = [];
let cursor;
do {
  const page = await list({ prefix: 'signups/', cursor });
  for (const blob of page.blobs) {
    const { stream } = await get(blob.pathname, { access: 'private', useCache: false });
    signups.push(JSON.parse(await new Response(stream).text()));
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

signups.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

console.log('email,created_at');
for (const { email, createdAt } of signups) {
  console.log(`"${email.replaceAll('"', '""')}",${createdAt}`);
}
console.error(`${signups.length} signups`);
