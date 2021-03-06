/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Dev tools handlers.                                                                            */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import nodeinfo   from 'nodejs-info'; // node info
import dateFormat from 'dateformat';  // Steven Levithan's dateFormat()

import Db from '../../lib/mongodb.js';


class Dev {

    /**
     * Information about current Node versions.
     */
    static nodeinfo(ctx) {
        ctx.response.body = nodeinfo(ctx.req);
    }


    /**
     * Show access log.
     */
    static async logAccess(ctx) {
        // access logging uses capped collection log-access (size: 1000×1e3, max: 1000)
        const log = await Db.collection('log-access');

        const entriesAll = (await log.find({}).sort({ $natural: -1 }).toArray());

        // 'from' defaults to later of first entry or 1 month ago
        const oldest = entriesAll.reduce((old, e) => e._id.getTimestamp()<old ? e._id.getTimestamp() : old, new Date());
        const monthAgo = new Date(); monthAgo.setMonth(new Date().getMonth() - 1);
        ctx.request.query.from = ctx.request.query.from || dateFormat(oldest<monthAgo ? monthAgo : oldest, 'yyyy-mm-dd');

        // 'to' defaults to today
        ctx.request.query.to = ctx.request.query.to || dateFormat('yyyy-mm-dd');
        // filter needs 1 day added to 'to' to made it end of the day
        const toFilter = new Date(ctx.request.query.to); toFilter.setDate(toFilter.getDate() + 1);

        // filter results according to query string
        const entriesFiltered = entriesAll
            .filter(e => ctx.request.query.from ? e._id.getTimestamp() >= new Date(ctx.request.query.from) : true)
            .filter(e => ctx.request.query.to ? e._id.getTimestamp() <= toFilter : true)
            .filter(e => ctx.request.query.app ? RegExp('^'+ctx.request.query.app).test(e.host) : true)
            .filter(e => ctx.request.query.time ? e.ms > ctx.request.query.time : true);

        // add in extra fields to each entry
        const entries = entriesFiltered.map(e => {
            return Object.assign(e, {
                time:  dateFormat(e._id.getTimestamp(), 'yyyy-mm-dd HH:MM:ss'),
                host:  e.host.replace('koa-sample-app.movable-type.co.uk', ''),
                path:  e.url.split('?')[0] + (e.url.split('?').length>1 ? '?…' : ''),
                qs:    e.url.split('?')[1],
                os:    Number(e.ua.os.major) ? `${e.ua.os.family} ${e.ua.os.major}` : e.ua.os.family,
                ua:    Number(e.ua.major) ? e.ua.family+'-'+ e.ua.major : e.ua.family,
                ip:    e.ip,
                speed: e.ms>500 ? 'slow' : e.ms>100 ? 'medium' : '',
            });
        });

        // for display, time defaults to 0
        ctx.request.query.time = ctx.request.query.time || '0';

        const context = {
            entries:   entries,
            filter:    ctx.request.query,
            filterMin: dateFormat(oldest, 'yyyy-mm-dd'),
            filterMax: dateFormat('yyyy-mm-dd'),
        };

        await ctx.render('dev-logs-access', context);
    }


    /**
     * Show error log.
     */
    static async logError(ctx) {
        // error logging uses capped collection log-error (size: 1000×4e3, max: 1000)
        const log = await Db.collection('log-error');

        const entriesAll = (await log.find({}).sort({ $natural: -1 }).toArray());

        // 'from' defaults to later of first entry or 1 month ago
        const oldest = entriesAll.reduce((old, e) => e._id.getTimestamp()<old ? e._id.getTimestamp() : old, new Date());
        const monthAgo = new Date(); monthAgo.setMonth(new Date().getMonth() - 1);
        ctx.request.query.from = ctx.request.query.from || dateFormat(oldest<monthAgo ? monthAgo : oldest, 'yyyy-mm-dd');

        // 'to' defaults to today
        ctx.request.query.to = ctx.request.query.to || dateFormat('yyyy-mm-dd');
        // filter needs 1 day added to 'to' to made it end of the day
        const toFilter = new Date(ctx.request.query.to); toFilter.setDate(toFilter.getDate() + 1);

        // filter results according to query string
        const entriesFiltered = entriesAll
            .filter(e => ctx.request.query.from ? e._id.getTimestamp() >= new Date(ctx.request.query.from) : true)
            .filter(e => ctx.request.query.to ? e._id.getTimestamp() <= toFilter : true);

        // add in extra fields to each entry
        const entries = entriesFiltered.map(e => {
            return Object.assign(e, {
                time:      dateFormat(e._id.getTimestamp(), 'yyyy-mm-dd HH:MM:ss'),
                host:      e.host.replace('koa-sample-app.movable-type.co.uk', ''),
                path:      e.url.split('?')[0] + (e.url.split('?').length>1 ? '?…' : ''),
                qs:        e.url.split('?')[1],
                os:        Number(e.ua.os.major) ? `${e.ua.os.family} ${e.ua.os.major}` : e.ua.os.family,
                ua:        Number(e.ua.major) ? e.ua.family+'-'+ e.ua.major : e.ua.family,
                ip:        e.ip,
                showstack: e.stack ? 'show' : 'hide',
            });
        });

        // for display, time defaults to 0
        ctx.request.query.time = ctx.request.query.time || '0';

        const context = {
            entries:   entries,
            filter:    ctx.request.query,
            filterMin: dateFormat(oldest, 'yyyy-mm-dd'),
            filterMax: dateFormat('yyyy-mm-dd'),
        };

        await ctx.render('dev-logs-error', context);
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Dev;
