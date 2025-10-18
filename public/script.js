        import Ticket from './db.js';

        const tickets = new Ticket();
        let ticketIdCounter = 1;
        let isModerator = false;
        const query = new URLSearchParams(window.location.search);

        // Éléments DOM
        const userView = document.getElementById('user-view');
        const loginView = document.getElementById('login-view');
        const moderatorView = document.getElementById('moderator-view');
        const ticketsList = document.getElementById('tickets-list');
        const ticketSolo = document.getElementById('ticket-solo');
        const loadingMessage = document.getElementById('loading-message');
        const userMessage = document.getElementById('user-message');
        const loginMessage = document.getElementById('login-message');
        const soloTicket = document.getElementById('load-ticket');

        // --- Fonctions Utilitaires ---
        
        function showModal(title, body, type = 'info', onConfirm = null) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-body').textContent = body;
            
            const okBtn = document.getElementById('modal-ok-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const modalContainer = document.getElementById('modal-container');

            okBtn.onclick = () => { modalContainer.classList.add('hidden'); };
            cancelBtn.classList.add('hidden');

            if (onConfirm) {
                cancelBtn.classList.remove('hidden');
                okBtn.textContent = "Confirmer";
                okBtn.onclick = () => {
                    modalContainer.classList.add('hidden');
                    onConfirm();
                };
                cancelBtn.onclick = () => {
                    modalContainer.classList.add('hidden');
                };
            } else {
                okBtn.textContent = "OK";
            }
            
            modalContainer.classList.remove('hidden');
        }

        function displayUserMessage(message, isSuccess = true) {
            userMessage.textContent = message;
            userMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
            
            if (isSuccess) {
                userMessage.classList.add('bg-green-100', 'text-green-700');
            } else {
                userMessage.classList.add('bg-red-100', 'text-red-700');
            }
            
            setTimeout(() => {
                userMessage.classList.add('hidden');
            }, 5000);
        }

        function formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleDateString('fr-FR', options);
        }

        function generateTicketId() {
            return `TICKET-${Date.now()}-${ticketIdCounter++}`;
        }

        let interval;
        function showView(viewName) {
            userView.classList.add('hidden');
            loginView.classList.add('hidden');
            moderatorView.classList.add('hidden');
            soloTicket.classList.add('hidden');
            query.set('page', viewName);
            window.history.replaceState({}, "", `${location.pathname}?${query}`);

            if (viewName === 'user-view') {
                userView.classList.remove('hidden');
                clearInterval(interval);
            } else if (viewName === 'login-view') {
                loginView.classList.remove('hidden');
                loginMessage.classList.add('hidden');
                document.getElementById('mod-password').value = '';
                clearInterval(interval);
            } else if (viewName === 'moderator-view') {
                if (!isModerator) {
                    loginView.classList.remove('hidden');
                    loginMessage.classList.add('hidden');
                    document.getElementById('mod-password').value = '';
                    return;
                }
                moderatorView.classList.remove('hidden');
                renderTickets();
                interval = setInterval(() => {
                    renderTickets();
                }, 10000);
            } else if (viewName === 'load-ticket') {
                if (!isModerator) {
                    loginView.classList.remove('hidden');
                    loginMessage.classList.add('hidden');
                    document.getElementById('mod-password').value = '';
                    return;
                }
                soloTicket.classList.remove('hidden');
                renderTickets(query.get('ticket'));
            } else {
                clearInterval(interval);
                showView('user-view');
            }
        }

        // --- Soumission de Ticket ---
        
        document.getElementById('ticket-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const ticketData = {
                id: generateTicketId(),
                service: document.getElementById('service').value,
                email: document.getElementById('email').value,
                pseudo: document.getElementById('pseudo').value,
                description: document.getElementById('description').value,
                status: 'Ouvert',
                createdAt: Date.now()
            };

            tickets.push(ticketData);
            
            displayUserMessage("Votre ticket a été soumis avec succès ! Nous vous répondrons bientôt.", true);
            document.getElementById('ticket-form').reset();
            
            console.log('Ticket créé:', ticketData);
        });

        // --- Connexion Modérateur ---
        
        document.getElementById('moderator-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('mod-password').value;
            
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ passwd: password })
            }).then(res => res.json());

            if (res.succes) {
                isModerator = true;
                showView(query.get('ticket') ? 'load-ticket' : 'moderator-view');
                loginMessage.classList.add('hidden');
            } else {
                loginMessage.classList.remove('hidden');

            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            isModerator = false;
            showView('user-view');
        });

        // --- Gestion des Tickets (Modérateur) ---
        
        function updateTicketStatus(ticketId, newStatus) {
            showModal("Confirmation de mise à jour", 
                `Voulez-vous vraiment changer le statut de ce ticket à "${newStatus}" ?`, 
                'confirm', 
                async () => {
                    await tickets.update({ id: ticketId, status: newStatus })
                    renderTickets();
                    displayUserMessage(`Statut du ticket mis à jour : ${newStatus}`, true);
                }
            );
        }

        function deleteTicket(ticketId) {
            showModal("Confirmation de Suppression", 
                "CETTE ACTION EST IRRÉVERSIBLE. Voulez-vous vraiment supprimer ce ticket ?", 
                'confirm', 
                async () => {
                    await tickets.delete({ id: ticketId });
                    renderTickets();
                    displayUserMessage(`Ticket supprimé.`, true);
                }
            );
        }

        // --- Affichage des Tickets ---
        
        async function renderTickets(ticket_id) {

            try {
                    
                ticketsList.innerHTML = '';
                ticketSolo.innerHTML = '';

                if (await tickets.get().length === 0) {
                    loadingMessage.classList.remove('hidden');
                    loadingMessage.textContent = 'Aucun ticket ouvert actuellement.';
                    return;
                }

                loadingMessage.classList.add('hidden');

                // Tri des tickets
                let __tickets = await tickets.get();

                let sortedTickets;
                if (ticket_id) {
                    sortedTickets = [...__tickets].filter(ticket => ticket.id == ticket_id)[0];
                    sortedTickets = [ sortedTickets ];
                    console.log(sortedTickets)
                }
                else
                {
                    sortedTickets = [...__tickets].sort((a, b) => {
                        if (a.status === 'Ouvert' && b.status !== 'Ouvert') return -1;
                        if (a.status !== 'Ouvert' && b.status === 'Ouvert') return 1;
                        return b.createdAt - a.createdAt;
                    });
                }

                sortedTickets.forEach(ticket => {
                    const statusColor = ticket.status === 'Ouvert' ? 'bg-yellow-100 text-yellow-800' : 
                                    ticket.status === 'En Cours' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-green-100 text-green-800';
                    
                    const borderColor = ticket.status === 'Ouvert' ? 'border-yellow-500' : 
                                    ticket.status === 'En Cours' ? 'border-blue-500' : 
                                    'border-green-500';
                    
                    const card = document.createElement('div');
                    card.className = `bg-white p-6 rounded-xl shadow-lg border-l-4 ${borderColor}`;
                    card.innerHTML = `
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                            <h3 class="text-xl font-bold truncate pr-4">Ticket #${ticket.id}</h3>
                            <span class="text-sm font-semibold px-3 py-1 rounded-full ${statusColor} mt-2 sm:mt-0">${ticket.status}</span>
                        </div>

                        <div class="text-sm space-y-1 mb-4 text-gray-600">
                            <p><strong>Service :</strong> <span class="capitalize">${ticket.service}</span></p>
                            <p><strong>De :</strong> ${ticket.pseudo} (<a href="mailto:${ticket.email}" class="text-blue-500 hover:text-blue-700">${ticket.email}</a>)</p>
                            <p><strong>Soumis le :</strong> ${formatDate(ticket.createdAt)}</p>
                        </div>
                        
                        <div class="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p class="font-medium text-gray-800 mb-1">Description :</p>
                            <p class="text-gray-700 whitespace-pre-wrap">${ticket.description}</p>
                        </div>

                        <div class="mt-4 flex flex-wrap gap-2">
                            <select 
                                class="input-style border text-sm py-2 px-3 bg-gray-50 flex-grow max-w-xs"
                                onchange="updateTicketStatus('${ticket.id}', this.value); this.value = ''"
                            >
                                <option value="" disabled selected>Changer Statut...</option>
                                <option value="Ouvert">Ouvert</option>
                                <option value="En Cours">En Cours</option>
                                <option value="Fermé">Fermé</option>
                            </select>
                            <button 
                                onclick="deleteTicket('${ticket.id}')" 
                                class="py-2 px-3 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition"
                            >
                                Supprimer
                            </button>
                        </div>
                    `;
                    if (ticket_id) return ticketSolo.appendChild(card);
                    ticketsList.appendChild(card);
                });
            }
            catch (err) {
                return console.error(err);
            }
            finally {
                return console.log('Ticket chargé avec succes');
            }
        }

        // Rendre les fonctions accessibles globalement pour les handlers inline
        window.updateTicketStatus = updateTicketStatus;
        window.deleteTicket = deleteTicket;

        // --- Événements de Navigation ---
        
        document.getElementById('access-moderator-btn').addEventListener('click', () => {
            showView('login-view');
        });

        document.getElementById('back-to-user-btn').addEventListener('click', () => {
            showView('user-view');
        });


        if (query.get('page')) {
            showView(query.get('page'));
        } else {
            showView('user-view');
        }

