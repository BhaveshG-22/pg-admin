#!/usr/bin/env ts-node
/**
 * Reorganize model mappings into male/female structure
 */

import * as fs from 'fs'
import * as path from 'path'

interface ModelImageMapping {
  id: string
  gender: 'male' | 'female'
  localPath: string
  s3Key: string
  s3Url: string
}

interface OrganizedMappings {
  male: ModelImageMapping[]
  female: ModelImageMapping[]
}

function main() {
  // Read current mappings
  const mappingsPath = path.join(process.cwd(), 'model-s3-mappings.json')
  const mappings: ModelImageMapping[] = JSON.parse(
    fs.readFileSync(mappingsPath, 'utf-8')
  )

  // Separate by gender and sort by ID
  const maleMappings = mappings
    .filter((m) => m.gender === 'male')
    .sort((a, b) => {
      // Extract number from ID (e.g., male_01 -> 1)
      const aNum = parseInt(a.id.split('_')[1])
      const bNum = parseInt(b.id.split('_')[1])
      return aNum - bNum
    })

  const femaleMappings = mappings
    .filter((m) => m.gender === 'female')
    .sort((a, b) => {
      const aNum = parseInt(a.id.split('_')[1])
      const bNum = parseInt(b.id.split('_')[1])
      return aNum - bNum
    })

  // Create organized structure
  const organized: OrganizedMappings = {
    male: maleMappings,
    female: femaleMappings,
  }

  // Save to new file
  const outputPath = path.join(process.cwd(), 'models.json')
  fs.writeFileSync(outputPath, JSON.stringify(organized, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('Model Mappings Reorganized!')
  console.log('='.repeat(60))
  console.log(`Male models: ${maleMappings.length}`)
  console.log(`Female models: ${femaleMappings.length}`)
  console.log(`\nOutput file: models.json`)
  console.log('='.repeat(60))
  console.log('\nExample usage:')
  console.log(`  const models = require('./models.json')`)
  console.log(`  const randomMale = models.male[5]`)
  console.log(`  const randomFemale = models.female[5]`)
  console.log(`  console.log(randomMale.s3Url)`)
  console.log('='.repeat(60) + '\n')
}

main()
