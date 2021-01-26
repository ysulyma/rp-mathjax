const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: `${__dirname}/src/index.ts`,
  output: {
    filename: "rp-mathjax.js",
    path: __dirname,
    library: "RPMathJax",
    libraryTarget: "umd"
  },

  devtool: false,

  externals: {
    "ractive-player": {
      commonjs: "ractive-player",
      commonjs2: "ractive-player",
      amd: "ractive-player",
      root: "RactivePlayer"
    },
    "react": {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React"
    },
    "mathjax": {
      commonjs: "mathjax",
      commonjs2: "mathjax",
      amd: "mathjax",
      root: "MathJax"
    },
  },

  mode: "production",

  module: {
    rules: [
     {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          safari10: true
        }
      })
    ],
    emitOnErrors: true
  },

  plugins: [
    new webpack.BannerPlugin({
      banner: () => require("fs").readFileSync("./LICENSE", {encoding: "utf8"})
    })
  ],

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  }
}
