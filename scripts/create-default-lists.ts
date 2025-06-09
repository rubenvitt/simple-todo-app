import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DefaultListService } from '../src/common/services/default-list.service';

async function createDefaultLists() {
  console.log('🚀 Starting default list creation for existing users...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const defaultListService = app.get(DefaultListService);

  try {
    const result = await defaultListService.createDefaultListsForAllUsers();
    
    console.log('\n📊 Summary:');
    console.log(`   Users processed: ${result.processed}`);
    console.log(`   Default lists created: ${result.created}`);
    console.log(`   Users skipped (already have lists): ${result.processed - result.created}`);
    
    if (result.created > 0) {
      console.log(`\n✅ Successfully created ${result.created} default lists!`);
    } else {
      console.log('\n✨ All users already have lists - nothing to do!');
    }
  } catch (error) {
    console.error('❌ Error creating default lists:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the script
createDefaultLists().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});