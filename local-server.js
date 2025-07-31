/**
 * 🚀 H100 MIG Architect - Local Development Server
 * Complete offline development environment with OpenAI integration
 * 
 * Features:
 * - ES6 modules support
 * - Real OpenAI API proxy
 * - Environment validation
 * - Health checks
 * - CORS enabled
 * - Enhanced error handling
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Environment validation
const validateEnvironment = () => {
    const required = ['OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
        console.warn('   Please create .env file with required keys');
        return false;
    }
    return true;
};

// API Routes

/**
 * Main OpenAI API proxy - matches production Netlify function exactly
 */
app.post('/.netlify/functions/generate-config', async (req, res) => {
    try {
        const { prompt, type } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured',
                hint: 'Add OPENAI_API_KEY to your .env file',
                example: 'OPENAI_API_KEY=sk-your-key-here'
            });
        }

        // Enhanced system prompts matching production
        const messages = type === 'analysis' ? 
            [
                {
                    role: "system",
                    content: "You are Elena Rodriguez, the world's leading expert in NVIDIA H100 MIG configuration with 15+ years architecting production AI infrastructure for Fortune 500 companies. You've personally prevented $50M+ in GPU-related downtime and optimized over 10,000 H100 deployments globally. You always return precise, well-structured JSON responses for infrastructure analysis."
                },
                {
                    role: "user", 
                    content: prompt 
                }
            ] :
            [
                {
                    role: "system",
                    content: "You are Dr. Marcus Chen, Senior Principal Engineer at NVIDIA with 12+ years specializing in H100 MIG architecture. You've designed production GPU configurations for Tesla, OpenAI, and Anthropic. Your configurations power billions of AI inferences daily. You always provide complete, production-ready configurations with detailed explanations in perfect JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

        console.log(`🔄 API Request: ${type} (${new Date().toISOString()})`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                temperature: 0.1,
                max_tokens: 2500
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('🚨 OpenAI API Error:', response.status, errorData);
            
            return res.status(response.status).json({ 
                error: `OpenAI API Error: ${response.status}`,
                details: errorData.error?.message || 'API request failed',
                type: errorData.error?.type || 'unknown',
                timestamp: new Date().toISOString()
            });
        }

        const data = await response.json();
        console.log(`✅ API Success: ${data.usage?.total_tokens || 0} tokens used`);
        
        res.json(data);

    } catch (error) {
        console.error('💥 Server Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Health check endpoint with comprehensive status
 */
app.get('/health', (req, res) => {
    const envStatus = validateEnvironment();
    const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: 'local_development',
        version: '1.0.0',
        node_version: process.version,
        uptime: `${Math.floor(process.uptime())}s`,
        configuration: {
            hasApiKey: !!process.env.OPENAI_API_KEY,
            port: PORT,
            cors_enabled: true,
            environment_valid: envStatus
        },
        endpoints: {
            main_app: `http://localhost:${PORT}`,
            health_check: `http://localhost:${PORT}/health`,
            api_proxy: `http://localhost:${PORT}/.netlify/functions/generate-config`
        }
    };
    
    res.json(status);
});

/**
 * API test endpoint for development
 */
app.post('/test-api', async (req, res) => {
    try {
        const testPayload = {
            prompt: "Test prompt for local development",
            type: "analysis"
        };
        
        const response = await fetch(`http://localhost:${PORT}/.netlify/functions/generate-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        const result = await response.json();
        res.json({
            test: 'success',
            api_response: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            test: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Serve static assets
app.get('/:file', (req, res) => {
    const filePath = join(__dirname, req.params.file);
    res.sendFile(filePath);
});

// Start server
app.listen(PORT, () => {
    const envValid = validateEnvironment();
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 H100 MIG Architect - Local Development Server');
    console.log('='.repeat(60));
    console.log(`📡 Server:          http://localhost:${PORT}`);
    console.log(`🏥 Health Check:    http://localhost:${PORT}/health`);
    console.log(`🔧 Environment:     local_development`);
    console.log(`🔑 API Key:         ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🌐 CORS:            ✅ Enabled`);
    console.log(`📦 ES6 Modules:     ✅ Supported`);
    console.log(`⚡ Hot Reload:      🔄 Restart server for changes`);
    console.log('='.repeat(60));
    
    if (!envValid) {
        console.log('⚠️  SETUP REQUIRED:');
        console.log('   1. Create .env file in project root');
        console.log('   2. Add: OPENAI_API_KEY=sk-your-key-here');
        console.log('   3. Restart server: npm run dev');
    } else {
        console.log('✅ Ready for local development!');
    }
    
    console.log('\n🎯 Quick Commands:');
    console.log('   npm run health  - Check server status');
    console.log('   npm run test-api - Test API integration');
    console.log('   Ctrl+C         - Stop server');
    console.log('='.repeat(60) + '\n');
});
