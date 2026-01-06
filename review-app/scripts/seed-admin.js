#!/usr/bin/env node
/**
 * Seed an admin user into the MongoDB database.
 * Usage:
 *  ADMIN_EMAIL=admin@cuivehari.edu.pk ADMIN_PASSWORD=Secret123 node scripts/seed-admin.js
 * or
 *  node scripts/seed-admin.js admin@cuivehari.edu.pk Secret123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('Usage: provide ADMIN_EMAIL and ADMIN_PASSWORD as env vars or pass them as args');
    console.error('Example: ADMIN_EMAIL=admin@cuivehari.edu.pk ADMIN_PASSWORD=Secret123 node scripts/seed-admin.js');
    process.exit(1);
  }

  console.log('Connecting to', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // require project's models (relative to project root)
  const models = require(path.join(__dirname, '..', 'models'));
  const User = models.User;

  const existing = await User.findOne({ email: email.toLowerCase() });
  const hash = await bcrypt.hash(password, 10);
  if (existing) {
    console.log('Found existing user:', existing.email, '-> updating to admin and setting password');
    existing.passwordHash = hash;
    existing.role = 'admin';
    existing.isActive = true;
    if (!existing.name || !existing.name.first) existing.name = { first: 'Site', last: 'Admin' };
    await existing.save();
    console.log('Updated existing user to admin:', existing.email);
  } else {
    const u = new User({
      email: email.toLowerCase(),
      passwordHash: hash,
      role: 'admin',
      isActive: true,
      name: { first: 'Site', last: 'Admin' },
      createdAt: new Date()
    });
    await u.save();
    console.log('Created admin user:', u.email);
  }

  await mongoose.disconnect();
  console.log('Done. You can now login with', email);
  process.exit(0);
}

main().catch(err => {
  console.error('seed-admin error', err);
  process.exit(2);
});
