exports.handler = async (event, context) => {
    // Enable CORS for all origins
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the request body
        const { prompt, type } = JSON.parse(event.body);
        
        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Prompt is required' })
            };
        }

        // Get API key from environment variables (set in Netlify dashboard)
        const API_KEY = process.env.OPENAI_API_KEY;
        
        if (!API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Make request to OpenAI with enhanced system context
        const messages = type === 'analysis' ? 
            [
                {
                    role: "system",
                    content: "You are the world's leading expert in NVIDIA GPU infrastructure and MIG partitioning. You have architected production AI clusters for Fortune 500 companies, prevented millions in downtime, and optimized GPU efficiency across thousands of deployments. You always return precise, well-structured JSON responses for infrastructure analysis."
                },
                {
                    role: "user", 
                    content: prompt 
                }
            ] :
            [
                {
                    role: "system",
                    content: "You are a Senior DevOps Engineer specializing in NVIDIA GPU infrastructure and MIG partitioning. You have 10+ years of experience with production AI clusters. You always provide complete, production-ready configurations with detailed explanations in perfect JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",  // Latest and most capable model
                messages: messages,
                temperature: 0.1,  // Lower temperature for more consistent analysis
                max_tokens: 2500   // Increased for better detailed responses
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `OpenAI API Error: ${response.status}`,
                    details: errorData.error?.message || 'Unknown error'
                })
            };
        }

        const data = await response.json();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
