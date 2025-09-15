#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { golfCourses, type InsertGolfCourse } from '../shared/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadGolfCoursesData(): Promise<InsertGolfCourse[]> {
  const dataPath = join(__dirname, 'seed-data', 'golf-courses.json');
  const data = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(data);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🏌️  Starting golf courses seeding...');

  // Connect to database
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Load course data
    const coursesData = await loadGolfCoursesData();
    console.log(`📋 Loaded ${coursesData.length} courses from seed data`);

    // Check existing courses to avoid duplicates
    const existingCourses = await db.select({ name: golfCourses.name }).from(golfCourses);
    const existingNames = new Set(existingCourses.map(c => c.name));

    // Filter out courses that already exist
    const newCourses = coursesData.filter(course => !existingNames.has(course.name));

    if (newCourses.length === 0) {
      console.log('✅ All courses already exist in database. No seeding needed.');
      return;
    }

    console.log(`🌱 Seeding ${newCourses.length} new courses...`);

    // Insert new courses in batches to avoid overwhelming the database
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < newCourses.length; i += batchSize) {
      const batch = newCourses.slice(i, i + batchSize);

      await db.insert(golfCourses).values(batch);
      inserted += batch.length;

      console.log(`   📍 Inserted batch ${Math.ceil((i + batchSize) / batchSize)} (${inserted}/${newCourses.length} courses)`);
    }

    console.log(`✅ Successfully seeded ${inserted} golf courses!`);

  } catch (error) {
    console.error('❌ Error seeding golf courses:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}