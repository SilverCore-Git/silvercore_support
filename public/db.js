
export default class Ticket {

    constructor () {

    }

    async push(ticket) 
    {
        await fetch('/api/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticket)
        })
    }

    async get() 
    {
        const data = await fetch('/api/tickets').then(res => res.json());
        return data.data;
    }

}