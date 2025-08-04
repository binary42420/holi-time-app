// Simple test to check if avatar loading is working without infinite loops
import puppeteer from 'puppeteer';

async function testAvatarLoading() {
  console.log('🔍 Testing Avatar component for infinite loops...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Avatar')) {
        console.log(`🖥️  Console: ${text}`);
      }
    });
    
    // Track network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/avatar/image')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
        console.log(`📡 Avatar request: ${request.url()}`);
      }
    });
    
    console.log('📱 Navigating to avatar test page...');
    await page.goto('http://localhost:3000/debug/avatar-display', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('⏱️  Waiting 10 seconds to observe behavior...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Analyze results
    console.log('\n📊 Test Results:');
    console.log(`Total avatar requests: ${requests.length}`);
    
    if (requests.length === 0) {
      console.log('❌ No avatar requests detected - check if avatars are loading');
    } else if (requests.length <= 5) {
      console.log('✅ Normal request count - no infinite loop detected');
    } else {
      console.log('⚠️  High request count - possible infinite loop');
      
      // Check for repeated requests to same URL
      const urlCounts = {};
      requests.forEach(req => {
        const baseUrl = req.url.split('?')[0];
        urlCounts[baseUrl] = (urlCounts[baseUrl] || 0) + 1;
      });
      
      Object.entries(urlCounts).forEach(([url, count]) => {
        if (count > 2) {
          console.log(`🔄 URL requested ${count} times: ${url}`);
        }
      });
    }
    
    // Check if avatars are visible
    const avatarElements = await page.$$('img[src*="/avatar/image"]');
    console.log(`👤 Avatar images found: ${avatarElements.length}`);
    
    for (let i = 0; i < avatarElements.length; i++) {
      const isVisible = await avatarElements[i].isIntersectingViewport();
      const src = await avatarElements[i].evaluate(el => el.src);
      console.log(`   Avatar ${i + 1}: ${isVisible ? 'Visible' : 'Hidden'} - ${src.substring(0, 80)}...`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testAvatarLoading();