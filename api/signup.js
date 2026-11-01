import { createHash } from 'node:crypto';
import { put } from '@vercel/blob';

const EMAIL = /^[a-z0-9][^\s@]*@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_BODY_BYTES = 4096;

const MESSAGES = {
  ok: 'You are on the list. Go skate.',
  invalid: 'That email does not look right.',
  failed: 'That did not go through. Try again in a minute.',
};

export async function POST(request) {
  const respond = (status, message) => reply(request, status, message);

  if (!isSameOrigin(request)) return respond(403, MESSAGES.failed);
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return respond(413, MESSAGES.invalid);

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(400, MESSAGES.invalid);
  }

  // Only bots fill the hidden field. They get a normal answer and nothing is stored.
  if (form.get('company')) return respond(200, MESSAGES.ok);

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email)) return respond(400, MESSAGES.invalid);

  try {
    await store(email);
  } catch (error) {
    console.error('signup store failed:', error.name, error.message);
    return respond(500, MESSAGES.failed);
  }
  return respond(200, MESSAGES.ok);
}

// One private file per address. The hash keeps addresses out of the file names and removes duplicates.
async function store(email) {
  const hash = createHash('sha256').update(email).digest('hex');
  try {
    await put(`signups/${hash}.json`, JSON.stringify({ email, createdAt: new Date().toISOString() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
    });
  } catch (error) {
    if (!/already exists/i.test(error.message)) throw error;
  }
}

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// The page sends Accept: application/json. A browser without JavaScript gets a small page.
function reply(request, status, message) {
  if ((request.headers.get('accept') ?? '').includes('application/json')) {
    return Response.json({ message }, { status });
  }
  return new Response(`<!doctype html><title>Candi</title><p>${message}</p><p><a href="/">Back to Candi</a></p>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
