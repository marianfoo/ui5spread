const replace = require("replace-in-file");
const fs = require("fs");
const path = require('path')

function copyDirectorySync(src, dest, excludedFolder) {
	const files = fs.readdirSync(src);

	for (const file of files) {
		const srcPath = `${src}/${file}`;
		const destPath = `${dest}/${file}`;

		if (file === excludedFolder) {
			continue;
		}

		if (fs.statSync(srcPath).isFile()) {
			fs.copyFileSync(srcPath, destPath);
		} else if (fs.statSync(srcPath).isDirectory()) {
			fs.mkdirSync(destPath, { recursive: true });
			copyDirectorySync(srcPath, destPath, excludedFolder);
		}
	}
}

function replaceYamlFile(versionSlash) {
	fs.copyFileSync("ui5-publish.yaml", "ui5.yaml");
	const optionsYaml = {
		files: ["**/ui5.yaml"],
		from: [/XXXnamespaceSlashXXX/g],
		to: [versionSlash],
	};
	return replace.sync(optionsYaml);
}

function replaceYamlFileDeploy(versionShort) {
	fs.copyFileSync("ui5-deploy-publish.yaml", "ui5-deploy.yaml");
	const optionsYaml = {
		files: ["**/ui5-deploy.yaml"],
		from: [/XXXnamespaceShortXXX/g],
		to: [versionShort],
	};
	return replace.sync(optionsYaml);
}

function replaceWebappFolder(version, versionSlash) {
	// util.copyDirectorySync("src", "webapp");
	fs.copyFileSync("webapp/i18n/i18n_en.properties", "webapp/i18n/i18n.properties");
	const options = {
		files: ["**/webapp/**"],
		from: [/XXXnamespaceXXX/g, /XXXnamespaceSlashXXX/g],
		to: [version, versionSlash],
	};
	return replace.sync(options);
}

// replace version in examples folder
function replaceVersionInExamples(versionSlash, version, ui5Apps) {
	let manifests = [];
	ui5Apps.forEach((app) => {
		let path = "examples/packages/" + app + "/webapp/manifest.json";
		// Read the contents of the package.json file
		let manifest = fs.readFileSync(path, "utf8");
		// Parse the JSON content
		let manifestData = JSON.parse(manifest);
		// Replace with current version
		const resourceRoots = manifestData["sap.ui5"].resourceRoots;
		const updatedResourceRoots = {};
		Object.keys(resourceRoots)
			.filter(key => !key.startsWith("cc.excelUpload"))
			.forEach(key => {
				updatedResourceRoots[key] = resourceRoots[key];
			});
		updatedResourceRoots[`cc.excelUpload.${version}`] = `./thirdparty/customControl/excelUpload/${versionSlash}`;
		manifestData["sap.ui5"].resourceRoots = updatedResourceRoots
		manifestData["sap.ui5"]["componentUsages"]["excelUpload"].name = `cc.excelUpload.${version}`;
		// Stringify manifest data back to string
		manifestData = JSON.stringify(manifestData, null, 2);
		// Write back manifest file
		fs.writeFileSync(path, manifestData, "utf8");
	});
}

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach((file) => {
			const curPath = `${path}/${file}`;
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

function getPackageJson() {
	// Read the contents of the package.json file
	const packageJson = fs.readFileSync("package.json", "utf8");

	// Parse the JSON content
	return JSON.parse(packageJson);
}

function getVersionDots() {
	const packageData = getPackageJson();
	// Get the version from the parsed data
	return `v${packageData.version}`;
}

function getVersionSlash() {
	const version = getVersionDots();
	return version.replaceAll(".", "/");
}
function searchAndReplace(inputFile, search, replace) {
	const file = fs.readFileSync(inputFile, "utf8");
	let result = file.replace(search, replace);

	fs.writeFileSync(inputFile, result, "utf8");
}

function getTestappObject(scenario, version) {
	const testApps = fs.readFileSync(path.resolve(__dirname, 'testapps.json'), 'UTF-8');
	// const testApps = fs.readFileSync("./dev/testapps.json", "utf8");
	let json_data = JSON.parse(testApps);
	version = parseInt(version)

	for (let index = 0; index < json_data.length; index++) {
		const element = json_data[index];
		if (element.rootAppName === scenario) {
			const rootObject = element;
			if (rootObject.versionMinor === version) {
				return rootObject;
			} else {
				const rootVersions = rootObject.copyVersions
				for (let index = 0; index < rootVersions.length; index++) {
					const subObject = rootVersions[index];
					if (subObject.versionMinor === version) {
						return subObject;
					}
				}
			}
			break;
		}
	}



}


module.exports.getPackageJson = getPackageJson;
module.exports.getVersionDots = getVersionDots;
module.exports.getVersionSlash = getVersionSlash;
module.exports.replaceVersionInExamples = replaceVersionInExamples;
module.exports.replaceWebappFolder = replaceWebappFolder;
module.exports.replaceYamlFile = replaceYamlFile;
module.exports.replaceYamlFileDeploy = replaceYamlFileDeploy;
module.exports.copyDirectorySync = copyDirectorySync;
module.exports.deleteFolderRecursive = deleteFolderRecursive;
module.exports.searchAndReplace = searchAndReplace;
module.exports.getTestappObject = getTestappObject;