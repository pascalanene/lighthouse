/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
import {Configstore, inquirer} from './shim-modules';

const log = require('lighthouse-logger');

const MAXIMUM_WAIT_TIME = 20 * 1000;
// clang-format off
const MESSAGE =
  `${log.reset}Lighthouse is requesting permission to anonymously report back runtime exceptions.\n  ` +
  `${log.reset}This can include data such as the test URL, its subresources, your OS, Chrome version, and Lighthouse version.\n  ` +
  `May ${log.green}Lighthouse${log.reset} ${log.bold}report this data to aid in improving the tool?`;
// clang-format on

async function prompt() {
  if (!process.stdout.isTTY || process.env.CI) {
    // Default non-interactive sessions to false
    return false;
  }

  let timeout: NodeJS.Timer;

  const prompt = inquirer.prompt([
    {
      type: 'confirm',
      name: 'isErrorReportingEnabled',
      default: false,
      message: MESSAGE,
    },
  ]);

  const timeoutPromise = new Promise((resolve: (a: boolean) => {}) => {
    timeout = setTimeout(() => {
      prompt.ui.close();
      process.stdout.write('\n');
      log.warn('CLI', 'No response to error logging preference, errors will not be reported.');
      resolve(false);
    }, MAXIMUM_WAIT_TIME);
  });

  return Promise.race([
    prompt.then((result: {isErrorReportingEnabled: boolean}) => {
      clearTimeout(timeout);
      return result.isErrorReportingEnabled;
    }),
    timeoutPromise,
  ]);
}

export async function askPermission() {
  const configstore = new Configstore('lighthouse');
  let isErrorReportingEnabled = configstore.get('isErrorReportingEnabled');
  if (typeof isErrorReportingEnabled === 'boolean') {
    return isErrorReportingEnabled;
  }

  isErrorReportingEnabled = await prompt();
  configstore.set('isErrorReportingEnabled', isErrorReportingEnabled);
  return isErrorReportingEnabled;
}