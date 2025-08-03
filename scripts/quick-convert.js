import { AvatarConverter } from './convert-all-external-avatars.js';

async function quickConvert() {
  console.log('🚀 Quick Avatar Conversion\n');
  
  const converter = new AvatarConverter();
  
  try {
    // Run with verbose output
    const stats = await converter.convertAllExternalAvatars({
      dryRun: false,
      verbose: true
    });
    
    if (stats.converted > 0) {
      console.log('\n🎉 Conversion completed! All external URLs have been converted to local storage.');
    } else if (stats.total === 0) {
      console.log('\n✅ No external URLs found. All avatars are already converted!');
    } else {
      console.log('\n⚠️  Some conversions failed. Check the error details above.');
    }
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

quickConvert();