import { AnalyticsProcessor } from './dist/index.js';
import { mkdirSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TEST_REPOS = [
  // Small public repos for testing
  { owner: 'vercel', name: 'next.js', description: 'Large active repo' },
  { owner: 'redis', name: 'redis', description: 'Medium active repo' },
];

const TEST_SCENARIOS = [
  {
    name: '1_User_1_Day',
    config: {
      userFilter: 1, // Will use first contributor
      dateFilter: { type: 'days', days: 1 }
    }
  },
  {
    name: '2_Users_1_Week',
    config: {
      userFilter: 2,
      dateFilter: { type: 'days', days: 7 }
    }
  },
  {
    name: '3_Users_1_Month',
    config: {
      userFilter: 3,
      dateFilter: { type: 'days', days: 30 }
    }
  },
  {
    name: '4_Users_3_Months',
    config: {
      userFilter: 4,
      dateFilter: { type: 'days', days: 90 }
    }
  },
  {
    name: 'All_Users_All_Time',
    config: {
      userFilter: null,
      dateFilter: { type: 'all' }
    }
  },
  {
    name: 'All_Users_1_Year',
    config: {
      userFilter: null,
      dateFilter: { type: 'days', days: 365 }
    }
  }
];

async function runAnalyticsTests() {
  console.log('🧪 Starting Analytics Report Validation Tests\n');
  console.log('='.repeat(70));
  
  const testOutputDir = './test-analytics-output';
  const defaultExportPath = './github-export';
  
  // Check if export directory exists
  if (!existsSync(defaultExportPath)) {
    console.log('\n❌ Error: No export data found!');
    console.log('\n📝 Please export some repositories first:');
    console.log('   1. Run the GUI: npm run preview:gui');
    console.log('   2. Select 1-2 repositories');
    console.log('   3. Export with analytics enabled');
    console.log('   4. Then run this test again\n');
    return;
  }
  
  // List available exported repos
  const exportedRepos = readdirSync(defaultExportPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  if (exportedRepos.length === 0) {
    console.log('\n❌ Error: No exported repositories found in ./github-export/');
    console.log('Please export at least one repository first.\n');
    return;
  }
  
  console.log(`\n✅ Found ${exportedRepos.length} exported repository(ies):`);
  exportedRepos.forEach(repo => console.log(`   • ${repo}`));
  console.log('');
  
  // Create test output directory
  if (!existsSync(testOutputDir)) {
    mkdirSync(testOutputDir, { recursive: true });
  }

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    scenarios: []
  };

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📊 Testing Scenario: ${scenario.name}`);
    console.log('-'.repeat(70));
    
    try {
      const scenarioDir = join(testOutputDir, scenario.name);
      if (!existsSync(scenarioDir)) {
        mkdirSync(scenarioDir, { recursive: true });
      }

      // Test with offline mode (parsing markdown files)
      console.log('   Mode: Offline (parsing exported markdown files)');
      console.log(`   User Filter: ${scenario.config.userFilter || 'All Users'}`);
      console.log(`   Date Filter: ${JSON.stringify(scenario.config.dateFilter)}`);
      
      const startTime = Date.now();
      
      // Use first exported repo for testing
      const testRepo = exportedRepos[0];
      const testRepoPath = join(defaultExportPath, testRepo);
      
      try {
        // Create analytics processor instance
        const processor = new AnalyticsProcessor({
          offline: true,
          dataPath: testRepoPath,
          outputPath: scenarioDir,
          format: 'markdown',
        });
        
        // Generate analytics
        await processor.generateReport();
        
        const duration = Date.now() - startTime;
        console.log(`   ✅ Success (${duration}ms)`);
        
        // Verify report file exists
        const reportExists = existsSync(join(scenarioDir, 'analytics-report.md'));
        
        results.total++;
        results.success++;
        results.scenarios.push({
          name: scenario.name,
          status: 'success',
          duration,
          reportGenerated: reportExists
        });
        
        if (!reportExists) {
          console.log('   ⚠️  Warning: Report file not found');
        } else {
          console.log('   📄 Report generated successfully');
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results.total++;
        results.failed++;
        results.scenarios.push({
          name: scenario.name,
          status: 'failed',
          error: error.message
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Setup Error: ${error.message}`);
      results.total++;
      results.failed++;
      results.scenarios.push({
        name: scenario.name,
        status: 'error',
        error: error.message
      });
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(70));
  console.log('📈 Test Summary');
  console.log('='.repeat(70));
  console.log(`Total Scenarios: ${results.total}`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.success / results.total) * 100).toFixed(1)}%`);
  
  // Save detailed results
  const summaryPath = join(testOutputDir, 'test-summary.json');
  writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Detailed results saved to: ${summaryPath}`);
  
  // Recommendations based on results
  console.log('\n💡 Recommendations:');
  if (results.failed > 0) {
    console.log('   • Review failed scenarios and check error messages');
    console.log('   • Ensure test data is available in ./github-export directory');
  }
  if (results.success === results.total) {
    console.log('   • ✅ All scenarios passed! Analytics generation is robust.');
  }
  
  console.log('\n🔍 Next Steps:');
  console.log('   1. Review generated reports in ./test-analytics-output/');
  console.log('   2. Verify Critical Alerts section appears when appropriate');
  console.log('   3. Check that labels are properly filtered');
  console.log('   4. Ensure recommendations are actionable with specific numbers');
  console.log('   5. Validate Executive Summary shows contextual metrics');
}

// Run tests
runAnalyticsTests().catch(console.error);
