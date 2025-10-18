
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

}

module.exports = Webhook;