var gulp = require("gulp")
var imagemin = require("gulp-imagemin")
var tinypng = require("gulp-tinypng-compress")
var pngquant = require("imagemin-pngquant")

gulp.task("image", function () {
    gulp.src("./ppp3/*.{png,jpg,jpeg}")
        .pipe(imagemin({
            optimizationLevel: 5,
            progressive: true,
            use: [pngquant()]
        }))
        .pipe(gulp.dest("./ppp4"));
})


