const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-7849050098929344-120302-cbf2d4b2f5fb0c2d4ec3950df8fbd5ff-2123976336';
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ROTA: Criar pagamento PIX
app.post('/api/criar-pix', async (req, res) => {
    try {
        const { valor } = req.body;

        console.log(`💰 Criando PIX de R$ ${valor}`);

        if (!valor || valor < 1) {
            return res.status(400).json({
                error: 'Valor inválido',
                message: 'O valor deve ser no mínimo R$ 1.00'
            });
        }

        const payload = {
            transaction_amount: parseFloat(valor),
            description: `Depósito Wendizx Store - R$ ${parseFloat(valor).toFixed(2)}`,
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@wendizx.com',
                first_name: 'Cliente',
                last_name: 'Wendizx'
            }
        };

        const response = await fetch(MP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erro na API:', data);
            return res.status(response.status).json({
                error: 'Erro ao criar PIX',
                details: data
            });
        }

        console.log('✅ PIX criado com sucesso! ID:', data.id);

        res.json({
            success: true,
            paymentId: data.id,
            qrCode: data.point_of_interaction?.transaction_data?.qr_code,
            qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
            status: data.status,
            amount: data.transaction_amount
        });

    } catch (error) {
        console.error('❌ Erro no servidor:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// ROTA: Verificar status do pagamento
app.get('/api/verificar-pagamento/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        const response = await fetch(`${MP_API_URL}/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro ao verificar pagamento',
                details: data
            });
        }

        res.json({
            success: true,
            paymentId: data.id,
            status: data.status,
            statusDetail: data.status_detail,
            amount: data.transaction_amount
        });

    } catch (error) {
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// ROTA: Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// ROTA: Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Para Vercel (serverless)
if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log('═══════════════════════════════════════');
        console.log('🚀 SERVIDOR MERCADO PAGO INICIADO');
        console.log('═══════════════════════════════════════');
        console.log(`📡 Porta: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`💳 API Key: ${MP_ACCESS_TOKEN.substring(0, 20)}...`);
        console.log('═══════════════════════════════════════');
    });
}