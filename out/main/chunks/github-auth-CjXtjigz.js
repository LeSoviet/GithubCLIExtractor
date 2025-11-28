import { e as execGh } from "../index.js";
import "electron";
import "path";
import "url";
import "child_process";
import "util";
import "bottleneck";
import "chalk";
import "fs/promises";
import "fs";
import "date-fns";
async function getAuthStatus() {
  try {
    const output = await execGh("auth status");
    const loggedInMatch = output.match(/Logged in to github\.com as ([^\s]+)/);
    const username = loggedInMatch ? loggedInMatch[1] : void 0;
    return {
      isAuthenticated: true,
      username
    };
  } catch (error) {
    return {
      isAuthenticated: false
    };
  }
}
export {
  getAuthStatus
};
