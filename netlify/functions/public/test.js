exports.handler = async (event, context) => {

    const headers = {
        'Access-Control-Allow-Origin': '*', // Adjust the origin if necessary
        'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
        'Access-Control-Allow-Methods': 'POST',
    };
    
    console.log('event test :', event);
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }
}