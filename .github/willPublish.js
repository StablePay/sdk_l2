const exec = require('child_process').exec;

/**
 * Execute simple shell command (async wrapper).
 * @param {String} cmd
 * @return {Object} { stdout: String, stderr: String }
 */
async function shell(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function getProjectNameAndVersion() {
  const pkgJson = require('../package.json');
  return [pkgJson.name.trim(), pkgJson.version.trim()];
}

async function getPublishedVersion(packageName) {
  // Invoke npm to get the package name version.
  const cmd = `npm view ${packageName} version`;
  try {
    const { stdout } = await shell(cmd);
    // Obtain result from stdout splitting lines by new-line character
    const stdoutLines = stdout.split('\n');
    if (stdoutLines.length < 1) {
      return { ok: false, msg: 'Version not provided by NPM', version: '' };
    }

    // Expect the version string to be in the first line of the standard
    // output. Trim.
    return { ok: true, msg: '', version: stdoutLines[0].trim() };
  } catch (err) {
    // Check for error 404 which means the package does not exist in the
    // public registry.
    const notExists = err.message.includes('ERR! 404');
    if (notExists) {
      msg = `Package ${packageName} is not in the NPM registry. A first version may be deployed`;
      return { ok: true, msg, version: '' };
    }

    // NPM failed miserably...
    return { ok: false, msg: err.message, version: '' };
  }
}

async function checkMergePublish() {
  // Get package name and version from package.json.
  const [pkgJsonName, pkgJsonVersion] = await getProjectNameAndVersion();

  const { ok, msg, version } = await getPublishedVersion(pkgJsonName);
  // The only condition to block merge to the target would be that the
  // version specified in the package.json file is less than the one published
  // in the NPM registry. In any other case, the merge will NOT be blocked.
  // However, publish to NPM will ONLY be performed if the version in the
  // package.json is greater than the latest version in registry or no version
  // published there. In case of NPM failure, merge will still be possible,
  // but no publish will be performed.
  if (ok) {
    if (version) {
      ret = {
        merge: pkgJsonVersion >= version,
        publish: pkgJsonVersion > version,
      };
      if (!ret.merge) {
        console.error(
          `WILL NOT MERGE. Attempting to lower version. (Published: ${version}, Local: ${pkgJsonVersion})`
        );
      }
      if (!ret.publish) {
        console.log(
          `Will not publish. Local version should be higher. (Published: ${version}, Local: ${pkgJsonVersion})`
        );
      }
      return ret;
    } else {
      // Package not published to NPM.
      console.log(msg);
      return {
        merge: true,
        publish: true,
      };
    }
  }

  // Not OK response from NPM (different from 404).
  console.log(`Will not publish. Error with NPM`);
  console.error(msg);
  return {
    merge: true,
    publish: false,
  };
}

async function main() {
  const { merge, publish } = await checkMergePublish();
  // Process exit code different from zero means merge will be blocked.
  if (!merge) {
    process.exit(1);
  }

  if (publish) {
    console.log('TRUE');
  } else {
    console.log('FALSE');
  }
  process.exit(0);
}

main();
