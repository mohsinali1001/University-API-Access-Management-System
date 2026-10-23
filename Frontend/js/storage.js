/* ------------------------------------------------------------------
   KeyStore: where API keys live in the browser.
   - Student/teacher key  -> localStorage   (saved on the Settings page, survives restarts)
   - Admin key            -> sessionStorage (forgotten when the tab is closed)
   Every access is wrapped in try/catch because storage can be blocked.
------------------------------------------------------------------- */
const KeyStore = (() => {
    const USER_KEY  = 'uaams.userKey';
    const USER_META = 'uaams.userMeta';   // { role, name } learned when the key was verified
    const ADMIN_KEY = 'uaams.adminKey';
    const QUOTA     = 'uaams.quota';      // last seen { limit, remaining }

    const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
    const write = (store, key, value) => { try { store.setItem(key, value); return true; } catch { return false; } };
    const remove = (store, key) => { try { store.removeItem(key); } catch { /* ignore */ } };
    const readJson = (store, key) => { try { return JSON.parse(read(store, key)); } catch { return null; } };

    return {
        // ----- student / teacher key -----
        getUserKey: () => read(localStorage, USER_KEY),
        getUserMeta: () => readJson(localStorage, USER_META),
        saveUserKey(key, meta = null) {
            const ok = write(localStorage, USER_KEY, key);
            if (meta) write(localStorage, USER_META, JSON.stringify(meta));
            remove(sessionStorage, QUOTA);          // quota belongs to the previous key
            return ok;
        },
        clearUserKey() {
            remove(localStorage, USER_KEY);
            remove(localStorage, USER_META);
            remove(sessionStorage, QUOTA);
        },

        // ----- admin key -----
        getAdminKey: () => read(sessionStorage, ADMIN_KEY),
        saveAdminKey: (key) => write(sessionStorage, ADMIN_KEY, key),
        clearAdminKey: () => remove(sessionStorage, ADMIN_KEY),

        // ----- last known request quota (shown in the navbar) -----
        getQuota: () => readJson(sessionStorage, QUOTA),
        saveQuota: (quota) => write(sessionStorage, QUOTA, JSON.stringify(quota))
    };
})();
