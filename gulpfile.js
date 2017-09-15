/*
 * Combines and minifies css & javascript, then saves result in dist/.
 * Watches for changes in the static/ folder then rebuilds when necessary.
 * To make changes to the web code, run `gulp` in the repository directory when working.
 */

const gulp = require('gulp'),
	  concat = require('gulp-concat'),
	  sourcemaps = require('gulp-sourcemaps'),
	  gutil = require('gulp-util'),
	  spawn = require('child_process').spawn,
	  cp = require('async-child-process'),
	  uglify = require('gulp-uglify-es').default;

process.chdir('www');

async function spawnCompass() {
	const sass = spawn('compass', ['watch', '.'], {cwd: process.cwd()});

	sass.stdout.on('data', data => { gutil.log(data.toString()); });
	sass.stderr.on('data', data => { gutil.log(data.toString()); });
	sass.on('close', async code => {
		gutil.log(`Compass worker executed with code ${code}`);
		gutil.log("Respawning...");

		await spawnCompass();
	});

	await cp.childPrinted(sass, /watching for changes/);
}

gulp.task('compile-app-css', async () => await spawnCompass());

gulp.task('concat-vendor-js', () => {
	return gulp.src(['js/vendor/jquery-3.2.1.min.js', 'js/vendor/animsition.min.js', 'js/vendor/*.js'])
		.pipe(concat('iowa.vendor.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist'));
});

gulp.task('minify-app-js', cb => {
	return gulp.src(['js/*.js'])
		.pipe(uglify().on('error', e => {
			gutil.log("Failed to minify javascript:");
			gutil.log(e.message);
		}))
		.pipe(concat('iowa.min.js'))
		.pipe(gulp.dest('dist'));
});

const taskTree = ['concat-vendor-js', 'minify-app-js'];
gulp.task('default', taskTree.concat(['compile-app-css']));

gulp.task('stop', taskTree, () => {
	process.exit();
});

gulp.watch(['js/**/*.js'], ['minify-app-js']).on('change', (event) => {
	console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
});
gulp.watch(['js/vendor/*.js'], ['concat-vendor-js']).on('change', (event) => {
	console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
});