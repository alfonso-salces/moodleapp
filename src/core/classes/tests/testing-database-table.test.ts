// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CoreConstants } from '@/core/constants';
import { mock, mockSingleton } from '@/testing/utils';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { CoreTestingDatabaseTable } from '@classes/database/testing-database-table';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/site';
import { CoreConfig } from '@services/config';
import { CoreSites } from '@services/sites';

describe('CoreTestingDatabaseTable', () => {

    const siteUrl = 'https://school.moodledemo.net';
    const siteId = CoreSites.createSiteID(siteUrl, 'student');
    let site: CoreSite;

    beforeAll(async () => {
        await CoreConfig.initialize();
    });

    beforeEach(() => {
        CoreConstants.CONFIG.databaseOptimizations = { cachingStrategy: CoreDatabaseCachingStrategy.Testing };
        site = new CoreSite(siteId, siteUrl);

        mockSingleton(CoreSites, mock({
            getSite: () => Promise.resolve(site),
            getStoredCurrentSiteId: () => Promise.resolve(siteId),
            getCurrentSite: () => site,
        }));
    });

    it('Save a record successfully', async () => {
        const testingDbSpy = jest.spyOn(CoreTestingDatabaseTable.prototype, 'insert');
        const value = 'test 1';
        const key = 'test';
        await site.setLocalSiteConfig(key, value);
        const storedValue = await site.getLocalSiteConfig(key);

        expect(storedValue).toBe(value);
        expect(testingDbSpy).toHaveBeenCalledWith({ name: key, value });
    });

    it('Update a record successfully', async () => {
        const key = 'expirationTime';
        const value = 200;

        const insertDbSpy = jest.spyOn(CoreTestingDatabaseTable.prototype, 'insert');
        const updateDbSpy = jest.spyOn(CoreTestingDatabaseTable.prototype, 'update');
        await site.setLocalSiteConfig(key, value);
        const storedValue = await site.getLocalSiteConfig(key);

        expect(storedValue).toBe(value);
        expect(insertDbSpy).toHaveBeenCalledWith({ name: key, value });

        await site.invalidateWsCache();
        expect(updateDbSpy).toHaveBeenCalledWith({ expirationTime: 0 }, undefined);
    });

    it('Remove a record successfully', async () => {
        const key = 'test';
        const value = 'test 1';

        const insertDbSpy = jest.spyOn(CoreTestingDatabaseTable.prototype, 'insert');
        await site.setLocalSiteConfig(key, value);
        const storedValue = await site.getLocalSiteConfig(key);

        expect(storedValue).toBe(value);
        expect(insertDbSpy).toHaveBeenCalledWith({ name: key, value });

        const deleteDbSpy = jest.spyOn(CoreTestingDatabaseTable.prototype, 'deleteByPrimaryKey');
        await site.deleteSiteConfig(key);
        let error: CoreError | null = null;

        try {
            await site.getLocalSiteConfig(key);
        } catch (err) {
            error = err;
        }

        expect(error).toBeInstanceOf(Error);
        expect(deleteDbSpy).toHaveBeenCalledWith({ name: key });
    });

});
