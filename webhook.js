
class Webhook {

    constructor (webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    async send_new(ticket) {
        const ticketUrl = `https://support.silvercore.fr?page=load-ticket&ticket=${ticket.id}`;
        const payload = {
            embeds: [
                {
                    title: "🎫 Nouveau ticket créé sur le support",
                    description: `Un nouveau ticket a été ouvert sur **support.silvercore.fr**.`,
                    color: 0x3498db, // bleu
                    fields: [
                        { name: "🆔 ID du ticket", value: `\`\`\`${ticket.id}\`\`\``, inline: false },
                        { name: "💼 Service", value: ticket.service, inline: true },
                        { name: "👤 Auteur", value: ticket.pseudo, inline: true },
                        { name: "📧 Email", value: `[${ticket.email}](mailto:${ticket.email})`, inline: false },
                        { name: "📝 Description", value: `\`\`\`${ticket.description}\`\`\`` || "—", inline: false },
                        //{ name: "📅 Statut", value: ticket.status, inline: true },
                    ],
                    url: ticketUrl,
                    footer: { text: "SilverCore • Support" },
                    timestamp: new Date(ticket.createdAt).toISOString(),
                },
            ],
            content: `🔗 [Accéder au ticket](${ticketUrl})`,
        };


        await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Échec de l'envoi du webhook");
            console.log("✅ Notification Discord envoyée !");
        })
        .catch(console.error);
    }

    async send_status_update(ticket, oldStatus) {
        const ticketUrl = `https://support.silvercore.fr?page=load-ticket&ticket=${ticket.id}`;
        
        // Couleur différente selon le statut
        const statusColors = {
            "Ouvert": 0xf1c40f,     // jaune
            "En Cours": 0x3498db,   // bleu
            "Fermé": 0x2ecc71       // vert
        };

        const payload = {
            embeds: [
                {
                    title: "🔄 Mise à jour du ticket",
                    description: `Le statut du ticket **#${ticket.id}** a été modifié sur **support.silvercore.fr**.`,
                    color: statusColors[ticket.status] || 0x95a5a6, // gris par défaut
                    fields: [
                        { name: "🆔 ID du ticket", value: `\`\`\`${ticket.id}\`\`\``, inline: false },
                        { name: "💼 Service", value: ticket.service, inline: true },
                        { name: "👤 Auteur", value: ticket.pseudo, inline: true },
                        { name: "📧 Email", value: `[${ticket.email}](mailto:${ticket.email})`, inline: false },
                        { name: "📝 Description", value: `\`\`\`${ticket.description}\`\`\`` || "—", inline: false },
                        { 
                            name: "📅 Statut", 
                            value: `\`${oldStatus}\` → **\`${ticket.status}\`**`, 
                            inline: true 
                        },
                    ],
                    url: ticketUrl,
                    footer: { text: "SilverCore • Support" },
                    timestamp: new Date().toISOString(),
                },
            ],
            content: `⚙️ Le ticket **#${ticket.id}** a changé de statut : \`${oldStatus}\` → **\`${ticket.status}\`**\n🔗 [Accéder au ticket](${ticketUrl})`,
        };

        await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Échec de l'envoi du webhook");
            console.log(`✅ Notification Discord envoyée : ticket #${ticket.id} mis à jour.`);
        })
        .catch(console.error);
    }

    async send_deleted(ticket) {
        const ticketUrl = `https://support.silvercore.fr?page=load-ticket&ticket=${ticket.id}`;

        const payload = {
            embeds: [
                {
                    title: "🗑️ Ticket supprimé du support",
                    description: `Un ticket a été **supprimé** de **support.silvercore.fr**.`,
                    color: 0xe74c3c, // rouge
                    fields: [
                        { name: "🆔 ID du ticket", value: `\`\`\`${ticket.id}\`\`\``, inline: false },
                        { name: "💼 Service", value: ticket.service, inline: true },
                        { name: "👤 Auteur", value: ticket.pseudo, inline: true },
                        { name: "📧 Email", value: `[${ticket.email}](mailto:${ticket.email})`, inline: false },
                        { name: "📝 Description", value: `\`\`\`${ticket.description}\`\`\`` || "—", inline: false },
                        { name: "📅 Créé le", value: `<t:${Math.floor(ticket.createdAt / 1000)}:f>`, inline: true },
                    ],
                    footer: { text: "SilverCore • Support" },
                    timestamp: new Date().toISOString(),
                },
            ],
            content: `❌ Le ticket **#${ticket.id}** a été supprimé.\n🔗 [Voir les détails avant suppression](${ticketUrl})`,
        };

        await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Échec de l'envoi du webhook");
            console.log(`🗑️ Notification Discord envoyée : ticket #${ticket.id} supprimé.`);
        })
        .catch(console.error);
    }


}

module.exports = Webhook;