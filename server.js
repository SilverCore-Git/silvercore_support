const express = require('express');
const fs = require('fs').promises;
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const Webhook = require('./webhook');
require('dotenv').config();

const app = express();
const webhook = new Webhook('https://discord.com/api/webhooks/1429190805293236275/gRk_r5Nq_HO-qYOVeWFOIJoIeHgCiIhT6F9qcTwGObMkWZl-zVlMpBVFDS9Dau0m6VKy')
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'tickets.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));
app.use(express.static('public'));

// Fonction pour lire la base de données
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si le fichier n'existe pas, retourner un tableau vide
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Fonction pour écrire dans la base de données
async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Fonction pour générer un ID unique
function generateTicketId() {
    return `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- ROUTES ---

// GET - Récupérer tous les tickets
app.get('/api/tickets', async (req, res) => {
    try {
        const tickets = await readDB();
        res.json({
            success: true,
            count: tickets.length,
            data: tickets
        });
    } catch (error) {
        console.error('Erreur lors de la lecture des tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des tickets',
            error: error.message
        });
    }
});

// GET - Récupérer un ticket par ID
app.get('/api/tickets/:id', async (req, res) => {
    try {
        const tickets = await readDB();
        const ticket = tickets.find(t => t.id === req.params.id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du ticket',
            error: error.message
        });
    }
});

// POST - Créer un nouveau ticket
app.post('/api/tickets', async (req, res) => {
    try {
        const { service, email, pseudo, description } = req.body;
        
        // Validation des champs requis
        if (!service || !email || !pseudo || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis (service, email, pseudo, description)'
            });
        }
        
        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'email invalide'
            });
        }
        
        const tickets = await readDB();
        
        const newTicket = {
            id: generateTicketId(),
            service,
            email,
            pseudo,
            description,
            status: 'Ouvert',
            createdAt: Date.now()
        };
        
        tickets.push(newTicket);
        await writeDB(tickets);

        await webhook.send_new(newTicket);
        
        res.status(201).json({
            success: true,
            message: 'Ticket créé avec succès',
            data: newTicket
        });
    } catch (error) {
        console.error('Erreur lors de la création du ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du ticket',
            error: error.message
        });
    }
});

// PATCH - Mettre à jour le statut d'un ticket
app.patch('/api/tickets/:id', async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validation du statut
        const validStatuses = ['Ouvert', 'En Cours', 'Fermé'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Le statut doit être l'un des suivants: ${validStatuses.join(', ')}`
            });
        }
        
        const tickets = await readDB();
        const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
        
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket non trouvé'
            });
        }
        
        tickets[ticketIndex].status = status;
        tickets[ticketIndex].updatedAt = Date.now();
        
        await writeDB(tickets);
        
        res.json({
            success: true,
            message: 'Statut du ticket mis à jour',
            data: tickets[ticketIndex]
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du ticket',
            error: error.message
        });
    }
});

// DELETE - Supprimer un ticket
app.delete('/api/tickets/:id', async (req, res) => {
    try {
        const tickets = await readDB();
        const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
        
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket non trouvé'
            });
        }
        
        const deletedTicket = tickets.splice(ticketIndex, 1)[0];
        await writeDB(tickets);
        
        res.json({
            success: true,
            message: 'Ticket supprimé avec succès',
            data: deletedTicket
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du ticket',
            error: error.message
        });
    }
});

// DELETE - Supprimer tous les tickets (avec confirmation)
app.delete('/api/tickets', async (req, res) => {
    try {
        const { confirm } = req.query;
        
        if (confirm !== 'true') {
            return res.status(400).json({
                success: false,
                message: 'Ajoutez ?confirm=true pour confirmer la suppression de tous les tickets'
            });
        }
        
        const tickets = await readDB();
        const count = tickets.length;
        
        await writeDB([]);
        
        res.json({
            success: true,
            message: `${count} ticket(s) supprimé(s) avec succès`
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression des tickets',
            error: error.message
        });
    }
});

app.post('/api/login', (req, res) => {
    const passwd = req.body.passwd;
    const moderator_pass = process.env.moderator_pass;
    if (passwd === moderator_pass) {
        res.json({ succes: true });
        return;
    }
    res.json({ succes: false });
})

// Route par défaut
app.get('/api', (req, res) => {
    res.json({
        message: 'API Silvercore Support',
        version: '1.0.0',
        endpoints: {
            'GET /api/tickets': 'Récupérer tous les tickets',
            'GET /api/tickets/:id': 'Récupérer un ticket par ID',
            'POST /api/tickets': 'Créer un nouveau ticket',
            'PATCH /api/tickets/:id': 'Mettre à jour le statut d\'un ticket',
            'DELETE /api/tickets/:id': 'Supprimer un ticket',
            'DELETE /api/tickets?confirm=true': 'Supprimer tous les tickets'
        }
    });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
});