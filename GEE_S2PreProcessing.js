// ** 
// ----------- Sentinel-2 Download and Sample Processing -------------//
// This source code is prepared for the AGERS 2024 in collaboration with Geosoftware.ID
// created by: Ilham Jamaluddin
// **


// ---------- Artificial Intelligence for mangrove mapping and monitoring using ----------- //
//---Remote Sensing Imagery and Extreme Gradient Boosting (XGBoost) Algorithm with Python-- //


//-------------------------------------------------//
// ------------ Sentinel-2 Pre-Processing --------- //
//-------------------------------------------------//

// In this step we will learn to collect the Sentinel-2 image and apply the pre-processing steps
// Then we export and use the pre-processed Sentinel-2 image as the input data for XGBoost algorihtm
// This step also including the calculation of some spectral indices as the input data

// Map.centerObject(AOI, 13); // Zoom-in into the AOI

// -- Sentinel-2 Free-Cloud Processing -- //
// Create function for Sentinel-2 pre-processing
function S2_preprocessing(year){
  // filter date
  var startdate = (year)+'-01-01'; 
  var enddate = (year)+'-12-31'; 

  // Create cloud masking function for Sentinel-2
  function maskS2clouds(image) {
    var qa = image.select('QA60');
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask).divide(10000);
  }
  
  // Create function to add spectral indices that related with mangrove
  function addIndex(image) {
    // NDVI (Normalized Difference vegetation index) 
    var NDVI = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
    
    // NDMI (Normalized Difference Mangrove Index) https://doi.org/10.1080/2150704X.2016.1195935
    var NDMI = image.normalizedDifference(['B12', 'B3']).rename('ndmi');
    
    //CMRI (Combined Mangrove Recognition Index) https://doi.org/10.1016/j.mex.2018.09.011
    var CMRI = image.expression('NDVI-NDWI',{
      'NDVI':image.normalizedDifference(['B8','B4']),
      'NDWI':image.normalizedDifference(['B3','B8'])
    }).rename('cmri');
    
    return image.addBands(NDVI).addBands(NDMI).addBands(CMRI);
  }
  
  // Import and Filter Sentinel-2 Collection Level-2A (Surface Reflectance)
  var S2_dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(AOI) // filtering based on AOI
                    .filterDate(startdate, enddate) // filtering based on start date and end date
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',30)) // filtering based on cloud cover percentage
                    .map(maskS2clouds) // apply the cloud masking function
                    .map(addIndex);
  print('Filtered Sentinel-2 Dataset',S2_dataset);
  
  // Create median composite based on filtered Sentinel-2 dataset
  var Sen2 = S2_dataset.median().clip(AOI) // using median composite and clip based on AOI
  
  // Select the Sentinel-2 band that we will use for next process
  // Here we just selected Sentinel-2 band with 10 m spatial resolution (Blue-B2, Green-B3, Red-B4, and NIR-B8)
  // We also selected the SWIR band of Sentinel-2 (B11 and B12) because the SWIR band is very helpful to distinguish mangroves from other objects
  // Last we selected the spectral indices realted to the mangrove NDVI, NDMI, CMRI
  Sen2 = Sen2.select('B2','B3','B4','B8','B11','B12','ndvi','ndmi','cmri');
  print('Sentinel-2 Final Data', Sen2);
  
  return Sen2
}

// Generate Sentinel-2 data for year 2019 and 2024 using the created Sentinel-2 Preprocessing function
var Sen2_2019 = S2_preprocessing(2019); // For 2019
var Sen2_2024 = S2_preprocessing(2024); // For 2024
// ------------------ End of Sentinel-2 Pre-Processing ------------- //

// Add the mosaic image into map layer
var S2_Vis = {min: 0.0,max: 0.3,bands: ['B8', 'B11', 'B4'],}; // use the false color composite for visualization
Map.addLayer(Sen2_2019, S2_Vis, 'Sentinel-2 2019');
Map.addLayer(Sen2_2024, S2_Vis, 'Sentinel-2 2024');

// -- Export Sentinel-2 2019 image to .tif file format --//
Export.image.toDrive({
    image: Sen2_2019, // image's variable name that will be exported
    description: 'Sentinel2_2019', //  name description for export
    folder: 'Mangrove_AGERS2024', // google drive folder
    fileNamePrefix: 'Sentinel2_2019', // image name file
    region: AOI, // geographical extent
    scale: 10 // spatial resolution
});
// ------------------------------------------------//

// -- Export Sentinel-2 2024 image to .tif file format --//
Export.image.toDrive({
    image: Sen2_2024, // image's variable name that will be exported
    description: 'Sentinel2_2024', //  name description for export
    folder: 'Mangrove_AGERS2024', // google drive folder
    fileNamePrefix: 'Sentinel2_2024', // image name file
    region: AOI, // geographical extent
    scale: 10 // spatial resolution
});
// ------------------------------------------------//


//-------------------------------------------------//
// ------------ Sample Processing --------- //
//-------------------------------------------------//

// XGBoost algorithm is supervised classification that needs training sample
// In this step we will create point sample based on visual interpretation in Sentinel-2 image
// We will create two sample classes: 300 samples for each class
                            // 0 for non-mangrove class (including water, vegetation non-mangrove, and other ojects)
                            // 1 for mangrove class
// This sample processing is based on Sentinel-2 2019 image data

// Merge sample class
var sample_class = Non_Mangrove.merge(Mangrove); //merge all of training cla
                  
// ------- Export Sample Point to .shp ---------
Export.table.toDrive({
  collection: sample_class, // samples that will be exported
  folder: 'Mangrove_AGERS2024', // google drive folder
  description: 'sample_class_2019', // name description for export
  fileNamePrefix: 'sample_class_2019', // file name format
  fileFormat:'SHP'// file format
});
// ----------------------------------------//

// ------- Export Sample AOI to .shp ---------
Export.table.toDrive({
  collection: AOI, // samples that will be exported
  folder: 'Mangrove_AGERS2024', // google drive folder
  description: 'AOI_AGERS2024', // name description for export
  fileNamePrefix: 'AOI_AGERS2024', // file name format
  fileFormat:'SHP'// file format
});
// ----------------------------------------//
