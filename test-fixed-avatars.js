import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

async function testFixedAvatars() {
  try {
    // Test a user without avatar data (should redirect to UI Avatars)
    const testUserId = 'asdfghjklz0001qwertyuiop0'; // Lonzie Belcher Jr
    const avatarUrl = `http://localhost:3001/api/users/${testUserId}/avatar/image`;
    
    console.log(`Testing fixed avatar API: ${avatarUrl}`);
    
    const response = await fetch(avatarUrl, { redirect: 'manual' });
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      console.log(`✅ Redirected to: ${location}`);
      
      // Test the redirect URL
      if (location) {
        const redirectResponse = await fetch(location);
        console.log(`Redirect target status: ${redirectResponse.status} ${redirectResponse.statusText}`);
        const contentType = redirectResponse.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);
      }
    } else if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log(`✅ Direct response - Content-Type: ${contentType}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
    }
    
    // Test a user with avatar data (Allison Osband)
    console.log('\n--- Testing user with avatar data ---');
    const userWithAvatarId = 'cmdtsfp6k006vme9ewx4cjtsiq'; // Allison Osband
    const avatarUrl2 = `http://localhost:3001/api/users/${userWithAvatarId}/avatar/image`;
    
    console.log(`Testing avatar with data: ${avatarUrl2}`);
    
    const response2 = await fetch(avatarUrl2);
    console.log(`Status: ${response2.status} ${response2.statusText}`);
    
    if (response2.ok) {
      const contentType = response2.headers.get('content-type');
      console.log(`✅ Content-Type: ${contentType}`);
    } else {
      const errorText = await response2.text();
      console.log(`❌ Error response: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixedAvatars();