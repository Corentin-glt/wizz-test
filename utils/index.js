const utils = {};

async function fetchS3FileAsJson(url) {
  try {
    const response = await fetch(url);
    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Failed to fetch the file. Status: ${response.status} - ${response.statusText}`);
    } // Parse the response as JSON
    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error fetching or parsing S3 file:', error);
    throw error; // Re-throw the error to allow handling upstream
  }
}

utils.fetchS3FileAsJson = fetchS3FileAsJson;

module.exports = utils;
