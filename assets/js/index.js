const visit = new Date(new Date().setSeconds(0, 0)).getTime();
const map = new Map();

!function setClock() {
    const date = new Date();
    const time = date.getTime();
    const { year, month, day, hour, minute, second } = myTime();
    const hourOff = -date.getTimezoneOffset() / 60;
    const minuteOff = new Date(time - time % 1000 - hourOff * 60 * 60 * 1000);
    const tzOff = (new Date(year, month - 1, day, hour, minute, second) - minuteOff) / 1000 / 60 / 60;
    const tzDiff = tzOff - hourOff;

    update('#hour-hand', `rotate(${hour % 12 / 12 * 360 + minute / 60 * 30 + second / 60 / 60 * 30}deg)`);
    update('#minute-hand', `rotate(${minute / 60 * 360 + second / 60 * 6}deg)`);
    update('#second-hand', `rotate(${360 * Math.floor((time - visit) / 60 / 1000) + second / 60 * 360}deg)`);
    update('#date', new Date(time + tzDiff * 60 * 60 * 1000).toLocaleDateString());
    ['hour', 'minute', 'second'].forEach(u => update(`#${u}`, eval(u).toString().padStart(2, '0')));
    update('#timezone-diff', tzDiff === 0 ? 'same time' : (tzDiff > 0 ? `${format(tzDiff)} ahead` : `${format(-tzDiff)} behind`));
    update('#utc-offset', ` / UTC ${(tzOff >= 0 ? '+' : '')}${Math.floor(tzOff)}:${(tzOff % 1 * 60).toString().padStart(2, '0')}`);

    setRpcTimestamp(map.get('timestamp'));

    setTimeout(setClock, 1000 - time % 1000);

    function myTime() {
        const obj = {};
        const options = { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, day: 'numeric', month: 'numeric', year: 'numeric' };
        new Intl.DateTimeFormat([], options).formatToParts(new Date()).forEach(({ type, value }) => obj[type] = +value);
        return obj;
    };

    function format(tzDiff) {
        if (tzDiff < 0) return `-${format(-tzDiff)}`;
        const minute = tzDiff % 1 * 60;
        tzDiff = Math.floor(tzDiff);
        return minute ? `${tzDiff}h ${minute}m` : `${tzDiff}h`;
    }
}();

!function lanyard() {
    const ActivityType = ['Playing', 'Streaming to', 'Listening to', 'Watching', 'Custom status', 'Competing in'];
    const StatusColor = { online: '#4b8', idle: '#fa1', dnd: '#f44', offline: '#778' };
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    const img = document.getElementById("avatar");

    ws.addEventListener('open', () => ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: '344845849819348992' } })));
    ws.addEventListener('error', () => ws.close());
    ws.addEventListener('close', () => setTimeout(lanyard, 1000));

    ws.addEventListener('message', async ({ data }) => {
        const { t, d } = JSON.parse(data);
        if (t !== 'INIT_STATE' && t !== 'PRESENCE_UPDATE') return;

        img.src = "https://cdn.discordapp.com/avatars/" + d.discord_user.id + "/" + d.discord_user.avatar + ".gif";
        img.onerror = function () {
            this.src = this.src.replace(".gif", ".png");
        };
        update('#name', d.discord_user.display_name);
        update('#dot', StatusColor[d.discord_status]);

        const activities = d.activities.filter(a => a.type !== 4);
        if (!activities.length) {
            update('#status', d.discord_status);
            update(['#large_image', '#small_image', '#activity', '#details', '#state']);
            return setRpcTimestamp();
        }

        const a = activities[0];
        ['large_image', 'small_image'].forEach(size => update(`#${size}`,
            !a.assets?.[size]
                ? ''
                : a.assets[size].startsWith('mp:')
                    ? `--image: url(https://media.discordapp.net/${a.assets[size].slice(3)}?width=${getSize(size)}&height=${getSize(size)})`
                    : a.assets[size].startsWith('spotify:')
                        ? `--image: url(https://i.scdn.co/image/${a.assets[size].slice(8)})`
                        : `--image: url(https://cdn.discordapp.com/app-assets/${a.application_id}/${a.assets[size]}.png?size=${getSize(size)})`));
        update('#status', ActivityType[a.type]);
        update('#activity', a.name);
        update('#details', a.details);
        update('#state', a.state);

        const timestamp = a.timestamps?.end ? a.timestamps.end : a.timestamps?.start;
        if (map.get('timestamp') !== timestamp) setRpcTimestamp(map.set('timestamp', timestamp).get('timestamp'));
    });

    function getSize(size) {
        return size === 'large_image' ? 96 : 40;
    }
}();

function update(selector, value = '') {
    if (Array.isArray(selector)) return selector.forEach(s => update(s, value));
    if (map.get(selector) === value) return;

    const e = document.querySelector(selector);

    if (value.startsWith('rotate')) e.style.transform = value;
    else if (value.match(/^#[a-f0-9]+$/)) e.style.backgroundColor = value;
    else if (value.startsWith('--image')) e.style.setProperty(value.split(':')[0], value.split(' ')[1]);
    else if (value === '' && (['#large_image', '#small_image'].includes(selector))) e.removeAttribute('style');
    else e.textContent = value;

    map.set(selector, value);
}

function setRpcTimestamp(timestamp) {
    if (!timestamp) {
        update('#timestamp');
        return map.delete('timestamp');
    }
    const diff = Math.abs(timestamp - Date.now());
    const hour = Math.floor(diff / 1000 / 60 / 60);
    const minute = Math.floor(diff / 1000 / 60) % 60;
    const second = Math.floor(diff / 1000) % 60;
    const format = n => n.toString().padStart(2, '0');
    update('#timestamp', `${hour ? `${format(hour)}:` : ''}${format(minute)}:${format(second)} ${timestamp > Date.now() ? 'left' : 'elapsed'}`);
}

var snowflakes = new Snowflakes({
    color: '#25D1D1', /* Default: "#5ECDEF" */
    container: document.querySelector('#snowflakes-container'), // Default: document.body
    count: 100, // 100 snowflakes. Default: 50
    minOpacity: 0.6, // From 0 to 1. Default: 0.6
    maxOpacity: 1, // From 0 to 1. Default: 1
    minSize: 10, // Default: 10
    maxSize: 35, // Default: 25
    rotation: true, // Default: true
    speed: 0.7, // The property affects the speed of falling. Default: 1
    wind: false, // Without wind. Default: true
    width: 500, // Default: width of container
    height: 250, // Default: height of container
    zIndex: 100, // Default: 9999,
    autoResize: true // Default: true
});