// Test SINTA API
const SINTA_API_BASE = 'https://sinta.kemdiktisaintek.go.id/api/authors';

async function testSintaAPI(authorId) {
  console.log(`Testing SINTA API for author ID: ${authorId}`);
  
  try {
    const response = await fetch(`${SINTA_API_BASE}/${authorId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);
    
    if (!response.ok) {
      console.log(`Error: HTTP ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Response data keys:', Object.keys(data));
    
    if (data.publications) {
      console.log(`Found ${data.publications.length} publications`);
      if (data.publications.length > 0) {
        console.log('First publication:', JSON.stringify(data.publications[0], null, 2));
      }
    } else if (data.data?.publications) {
      console.log(`Found ${data.data.publications.length} publications (nested)`);
    } else {
      console.log('Publications structure:', JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test with author ID 8224
testSintaAPI('8224');
