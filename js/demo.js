$(document).ready(function () {
  var dropZone = $("#psd-drop").get(0);
  var psd;

  PSD.DEBUG = false;

  var handleDragOver = function (e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  var handleFile = function (e) {
    e.stopPropagation();
    e.preventDefault();

    var file = e.dataTransfer.files[0];
    if (file.type !== "image/vnd.adobe.photoshop" && file.type !== "application/x-photoshop") {
      $("#read-status > .alert")
        .removeClass()
        .addClass('alert alert-error')
        .html("Error: not a PSD file.");

      return;
    }

    $("#read-status > .alert")
      .removeClass()
      .addClass('alert alert-success')
      .html("PSD loaded. Parsing...");

    var reader = new FileReader();

    reader.onload = function (f) {
      var bytes = new Uint8Array(f.target.result);

      // Start over and parse the whole file.
      psd = new PSD(bytes);

      try {
        psd.parse();
      } catch (e) {
        console.log(e);
        $("#read-status > .alert")
          .removeClass()
          .addClass('alert alert-error')
          .html("ERROR: could not read PSD file due to a parsing error. This is a bug.")
      }

      var image = $("<img />").attr('src', psd.toImage());
      $("#image-output").html(image);

      if ($("#read-status > .alert").hasClass('alert-error')) {
        $("#read-status > .alert").html("Finished, but with errors. This is a bug.");
      } else {
        $("#read-status > .alert").html("Finished parsing!")
      }
      
      var psdInfo = {
        "Header Info": {
          Channels: psd.header.channels,
          Width: psd.header.cols,
          Height: psd.header.rows,
          Depth: psd.header.depth,
          Mode: psd.header.modename
        },
        "Layers": {}
      };

      var base = psd.getLayerStructure();

      var parseFolder = function (folder, baseObj) {
        var layer;
        for (var i = 0, _ref = folder.layers.length; i < _ref; i++) {
          layer = folder.layers[i];

          if (layer.layers) {
            layer.name = "(Group) " + layer.name;
            baseObj[layer.name] = {};
            parseFolder(layer, baseObj[layer.name]);
          } else {
            baseObj[layer.name] = {
              "Position & Size": {
                Top: layer.top,
                Left: layer.left,
                Width: layer.cols,
                Height: layer.rows
              },
              "Blending Mode": {
                Type: layer.blendMode.blender,
                Opacity: layer.blendMode.opacityPercentage + "%"
              }
            }
          }
        }
      };
      
      parseFolder(base, psdInfo["Layers"]);
      outputPSDInfo(psdInfo);
    };

    reader.readAsArrayBuffer(file);
  };

  var outputPSDInfo = function (info) {
    var ul = listFromObject(info);
    $("#text-info").html(ul);
  };

  var listFromObject = function (obj) {
    var ul = $("<ul />");

    $.each(obj, function (key, val) {
      var li = $("<li />");
      var html = key + ": ";
      
      if (typeof val === "object") {
        html += listFromObject(val).appendTo("<div />").parent().html();
      } else {
        html += val;
      }

      li.html(html);
      li.appendTo(ul);
    });

    return ul;
  };

  dropZone.addEventListener("dragover", handleDragOver, false);
  dropZone.addEventListener("drop", handleFile, false);
});